
try {
var _ = require('lodash');
var spawn = require('child_process').spawn;
var byline = require('byline');
} catch (e) {
    console.log(e)
    throw new Error('try using `npm link` for local development')
}

function git(args, opts) {
    return new Promise(function(resolve, reject) {
        opts.logger('spawning git ' + args.join(' ') + ' in ' + opts.cwd);
        var gitProc = spawn('git', args, {
            cwd: opts.cwd,
            stdio: (opts.stderr) ? ['pipe', 'pipe', process.stderr] : undefined,
            env: opts.env
        });
        var gitStream = byline(gitProc.stdout);
        gitStream.on('data', function(buff) {
            opts.onLine && opts.onLine(buff.toString());
        });
        gitProc.on('close', function() {
            opts.onClose && opts.onClose();
        });
        gitProc.on('exit', function (code) {
            opts.logger('git ' + args.join(' ') + ' exited with ' + code);
            if (code) {
                reject('git ' + args.join(' ') + ' exited with ' + code);
            } else {
                resolve();
            }
        });
    });
}

function findRepoPath(opts) {
    return new Promise(function(resolve, reject) {
        if (opts.repoPath) {
            // if repoPath was specified, use it
            resolve(opts.repoPath);
        } else {
            // otherwise find the root from the specified subdir, or the cwd
            git(["rev-parse", "--show-toplevel"], {
                cwd: opts.repoSubdir || process.cwd(),
                onLine: resolve,
                logger: opts.logger
            }).catch(reject);
        }
    }).then(function(repoPath) {
        opts.repoPath = repoPath;
    });
}

function parsePaths(repoPath, gitArgs, opts) {
    return new Promise(function(resolve, reject) {
        var paths = [];
        git(gitArgs, {
            cwd: repoPath,
            onLine: function(path) {
                paths.push(path);
            },
            onClose: function() {
                resolve(paths);
            },
            logger: opts.logger
        })
        .catch(reject);
    });
}

function lsTree(opts) {
    var gitArgs = ['ls-tree', '-r', '--name-only'];
    if (opts.at !== undefined) { gitArgs.push(opts.at); }
    return parsePaths(opts.repoPath, gitArgs, opts);
}

function diffTree(opts) {
    var gitArgs = ['diff']
    if (opts.args.length === 1 && opts.args[0] === 'HEAD' && opts.since === 'HEAD') {
        gitArgs.push('--staged')
    }
    gitArgs.push('--name-only');
    gitArgs.push(opts.since)

    opts.ignoreWhitespace && gitArgs.splice(1, 0, '-w');
    if (opts.until !== undefined) gitArgs.push(opts.until);
    return parsePaths(opts.repoPath, gitArgs, opts);
}

var BLAME_RX =       /^[^(]*\((.*?)\s+\d{4}-\d{2}-\d{2}/;
var BLAME_EMAIL_RX = /^[^(]*\(<(.*?)>\s+\d{4}-\d{2}-\d{2}/;

function blame(path, at, opts) {
    return new Promise(function(resolve, reject) {
        if (opts === undefined && typeof at === 'object') {
            opts = at;
            at = undefined;
        }

        var blame = {};
        var blameArgs = ['blame', '--', path];

        if (at !== undefined) blameArgs.splice(1, 0, at);
        if (opts.ignoreWhitespace) blameArgs.splice(1, 0, "-w");
        if (opts.email) blameArgs.splice(1, 0, "-e");

        git(blameArgs, {
            cwd: opts.repoPath,
            onLine: function(line) {
                var match = (opts.email ? BLAME_EMAIL_RX : BLAME_RX).exec(line);
                if (match) {
                    var author = match[1].trim();
                    var value = blame[author];
                    blame[author] = (value ? value : 0) + 1;
                } else {
                    opts.logger('Blame output did not match regex: ' + line);
                }
            },
            onClose: function() {
                opts.onBlameComplete();
                resolve(blame);
            },
            logger: opts.logger
        }).catch(reject);
    });
}

function mergeBlames(blames) {
    return _.reduce(blames, function (sum, next) {
        return _.merge(sum, next, function (a, b) {
            return a && b ? a + b : a || b;
        });
    }, {});
}

function deltaBlame(blameSince, blameUntil) {
    return _.omit(_.merge(blameSince, blameUntil, function(since, until) {
        if (since && until) {
            return until - since;
        } else if (since) {
            return -since; // all lines removed
        } else {
            return until; // new author, all lines added
        }
    }), function(val) { return val === 0; }); // omit zeroed out blame
}

function blamePaths(paths, at, batchSize, opts) {
    var pathBlames = [];
    var chain = new Promise(function(resolve) {resolve()}); // promise to start the chain - is there a better way?
    _.chunk(paths.map(function (path) {
        return function(resolve, reject) {
            blame(path, at, opts)
                .then(resolve)
                .catch(function () {
                    // blame will fail if file is missing, in which case consider it zero blame
                    resolve({});
                });
        };
    }), batchSize).forEach(function(batch, idx) {
        opts.logger('starting blame batch', batch, idx);
        chain = chain.then(function() {
            return new Promise(function(resolve, reject) {
                Promise.all(_.map(batch, function(blame) {
                    return new Promise(blame);
                })).then(function (results) {
                    opts.logger('blame batch', idx, results);
                    pathBlames = pathBlames.concat(results);
                    resolve(pathBlames);
                });
            });
        });
    });
    chain = chain.then(function() {
        return mergeBlames(pathBlames);
    });
    return chain;
}

var NOOP = function() {};

var DEFAULT_OPTS = {
    ignoreWhitespace: true,
    email: false,
    batchSize: 4,
    logger: NOOP,
    onBlameCount: NOOP,
    onBlameComplete: NOOP
};

function guilt(opts) {

    opts = _.extend({}, DEFAULT_OPTS, opts);

    if (opts.at && (opts.since || opts.until)) {
        throw 'opts.sha can\'t be used in conjunction with opts.since or opts.until';
    }

    if (opts.until && !opts.since) {
        throw 'opts.until can\'t be specified without opts.since';
    }

    if (!(opts.at || opts.since)) {
        opts.at = 'HEAD';
    }

    opts.batchSize = Math.max(opts.batchSize, 2);

    return findRepoPath(opts).then(function() {
        if (opts.at) {
            return lsTree(opts).then(function(paths) {
                opts.onBlameCount(paths.length);
                return blamePaths(paths, opts.at, opts.batchSize, opts);
            });
        } else {
            return diffTree(opts)
                .then(function(paths) {
                    opts.onBlameCount(paths.length * 2);
                    var batchSize = Math.max(opts.batchSize / 2, 1);
                    return Promise.all([
                        blamePaths(paths, opts.since, batchSize, opts),
                        blamePaths(paths, opts.until, batchSize, opts)
                    ]);
                })
                .then(function(sinceAndUntil) {
                    return deltaBlame(sinceAndUntil[0], sinceAndUntil[1]);
                });
        }
    });

}

module.exports = guilt;