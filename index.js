var _ = require('lodash');
var RSVP = require('rsvp');
var spawn = require('child_process').spawn;
var byline = require('byline');
var util = require('util');

function git(args, opts) {
    return new RSVP.Promise(function(resolve, reject) {
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
            if (code) {
                reject('git ' + args.join(' ') + ' exited with ' + code);
            } else {
                resolve();
            }
        });
    });
}

function findRepoPath(opts) {
    return new RSVP.Promise(function(resolve, reject) {
        if (opts.repoPath) {
            // if repoPath was specified, use it
            resolve(opts.repoPath);
        } else {
            // otherwise find the root from the specified subdir, or the cwd
            var revParseTl = spawn("git", ["rev-parse", "--show-toplevel"], {
                cwd: opts.repoSubdir || process.cwd()
            });
            var stream = byline(revParseTl.stdout);
            stream.on('data', function(line) {
                resolve(line.toString());
            });
            revParseTl.on('exit', function(code) {
                if (code !== 0) {
                    reject('git \"git rev-parse --show-toplevel\" exited with ' + code);
                }
            });
        }
    }).then(function(repoPath) {
        opts.repoPath = repoPath;
    });
}

function parsePaths(repoPath, gitArgs) {
    return new RSVP.Promise(function(resolve, reject) {
        var paths = [];
        git(gitArgs, {
            cwd: repoPath,
            onLine: function(path) {
                paths.push(path);
            },
            onClose: function() {
                resolve(paths);
            }
        })
        .catch(reject);
    });
}

function lsTree(opts) {
    var gitArgs = ['ls-tree', '-r', '--name-only'];
    if (opts.at !== undefined) { gitArgs.push(opts.at); }
    return parsePaths(opts.repoPath, gitArgs);
}

function diffTree(opts) {
    var gitArgs = ['diff', '--name-only', opts.since];
    opts.ignoreWhitespace && gitArgs.splice(1, 0, '-w');
    if (opts.until !== undefined) gitArgs.push(opts.until);
    return parsePaths(opts.repoPath, gitArgs);
}

var BLAME_RX = /^[^(]*\((.*?) \d{4}-\d{2}-\d{2}/;
var BLAME_EMAIL_RX = /^[^(]*\(<(.*?)> \d{4}-\d{2}-\d{2}/;

function blame(path, at, opts) {
    return new RSVP.Promise(function(resolve, reject) {
        if (opts === undefined && typeof at === 'object') {
            opts = at;
            at = undefined;
        }

        var blame = {};
        var blameArgs = ['blame', '--', path];

        if (at !== undefined) blameArgs.splice(1, 0, at);
        if (opts.ignoreWhitespace) blameArgs.splice(1, 0, "-w");
        if (opts.showEmail) blameArgs.splice(1, 0, "-e");

        git(blameArgs, {
            cwd: opts.repoPath,
            onLine: function(line) {
                var match = (opts.email ? BLAME_EMAIL_RX : BLAME_RX).exec(line);
                if (match) {
                    var author = match[1].trim();
                    var value = blame[author];
                    blame[author] = (value ? value : 0) + 1;
                }
            },
            onClose: function() {
                resolve(blame);
            }
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
    return _.merge(blameSince, blameUntil, function(since, until) {
        if (since && until) {
            return until - since;
        } else if (since) {
            return -since; // all lines removed
        } else {
            return until; // new author, all lines added
        }
    });
}

function blamePaths(paths, at, opts) {
    return RSVP.all(paths.map(function (path) {
        return new RSVP.Promise(function(resolve, reject) {
            blame(path, at, opts)
                .then(resolve)
                .catch(function () {
                    // blame will bail if file is missing, in which case consider it zero blame
                    resolve({});
                });
        });
    })).then(function(blames) {
        return mergeBlames(blames);
    });
}

//{
//    at: "",
//    repoPath: "",
//    repoSubdir: "",
//    since: "",
//    until: "",
//    ignoreWhitespace: "",
//    showEmail: ""
//}

function guilt(opts) {

    opts = _.extend({}, opts, {
        ignoreWhitespace: true,
        email: false
    });

    if (opts.at && (opts.since || opts.until)) {
        throw 'opts.sha can\'t be used in conjunction with opts.since or opts.until';
    }

    if (opts.until && !opts.since) {
        throw 'opts.until can\'t be specified without opts.since';
    }

    if (!(opts.at || opts.since)) {
        opts.at = 'HEAD';
    }

    return findRepoPath(opts).then(function() {
        if (opts.at) {
            return lsTree(opts).then(function(paths) {
                return blamePaths(paths, opts.at, opts);
            });
        } else {
            return diffTree(opts)
                .then(function(paths) {
                    return RSVP.all([
                        blamePaths(paths, opts.since, opts),
                        blamePaths(paths, opts.until, opts)
                    ]);
                })
                .then(function(sinceAndUntil) {
                    return deltaBlame(sinceAndUntil[0], sinceAndUntil[1]);
                });
        }
    });

}

module.exports = guilt;