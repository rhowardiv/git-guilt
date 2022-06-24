var rewire = require('rewire');
var guilt = rewire('../index.js');

var temp = require('temp').track();
var fs = require('fs');
var RSVP = require('rsvp');

var assert = require('chai').assert;
var fail = assert.fail;

var git = guilt.__get__('git');

var repoPath = temp.mkdirSync('repo');

describe('clone atlassian-jwt from bitbucket and calculate some guilt', function() {

  it('should clone a repository', function(done) {
    // clone can take a while
    this.timeout(20000);
    git(['clone', 'https://bitbucket.org/atlassian/atlassian-jwt', repoPath], {
      stderr: true,
      logger: console.error
    }).then(function () {
      done();
    }, function (err) {
      fail('git clone should exit without error', err);
    });
  });

  it('should calculate guilt for a single commit with single file '
   + '(three modified lines)', function(done) {
    guilt({
      repoPath: repoPath,
      logger: console.error,
      since: '670f5542c2805c4ded57ee1a6430cb5ff1729fef~1',
      until: '670f5542c2805c4ded57ee1a6430cb5ff1729fef'
    }).then(function(result) {
      assert.strictEqual(3, result['Tim Pettersen']);
      assert.strictEqual(-3, result['Peter Brownlow']);
      done();
    }).catch(function(err) {
      fail('git-guilt should return without error', err);
    });
  });

  it('should calculate guilt for a single commit over multiple files '
   + '(new and modified lines and deleted files)', function(done) {
    guilt({
      repoPath: repoPath,
      logger: console.error,
      since: 'b0cfb62771c751c21038587e34927bb181406a85~1',
      until: 'b0cfb62771c751c21038587e34927bb181406a85'
    }).then(function(result) {
      assert.strictEqual(116, result['Tim Pettersen']);
      done();
    }).catch(function(err) {
      fail('git-guilt should return without error', err);
    });
  });

});
