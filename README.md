# git-guilt

Calculates the change in blame between two commits, or the blame for the entire repository tree at a particular commit.

`git-guilt` is also available as a [Bitbucket add-on](https://gitguilt.com/bitbucket/atlassian-connect.json).

## Usage

     git-guilt [options] [<since>] [<until>]
     git-guilt [options] [-a|--all] <commit-ish>

     Options:

         -h, --help               output usage information
         -V, --version            output the version number
         -e, --email              display author emails instead of names
         -w, --ignore-whitespace  ignore whitespace only changes when attributing blame
         -X, --debug              output debug information
         -a, --at                 display the total blame for the entire repository tree at a particular commit
         -b, --batch-size <n>     specify the number of concurrent blame operations to run (minimum of 2, defaults to 4)
         -d, --dir <path>         force git-guilt to run in the specified directory rather than attempt to detect the repository root
      
## Installation

- Install [Git](http://git-scm.com/), [Node.js](http://nodejs.org/) (tested against v12.18.2/14.17.0/14.18.0) and [npm](https://npmjs.org/) (6/7)
- Run `yarn add git-guilt-staged --dev`. (Or `npm install --save-dev`)

### Add "Suggested reviewers: ..." to each commit message:

Your `.husky/commit-msg` should look like:

```sh
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

"$(git-root)/node_modules/.bin/git-guilt-commit-msg-hook" "$1"
```
NOTE: assumes you are using husky 7. Upgrading to husky v7 is super easy in my experience.

### post-commit hook

To see your blame delta after each commit, you can invoke git-guilt from a post-commit hook. Create an executable file at ``.git/hooks/post-commit`` and add the following:

    #!/bin/sh
    git guilt HEAD~1 HEAD

Then you should see blame delta information after each commit, e.g.:

    $ git commit -m "Flesh out README.md"
    Tim Pettersen        ++++++++++++++++++++++++++++++++++++++++++++++(79)
    Rebecca Willett      ----
    [master 35f9416] Flesh out README.md
    1 file changed, 82 insertions(+), 3 deletions(-)
    rewrite README.md (83%)

## Examples

Find blame delta from the last commit:

	$ git-guilt HEAD~1 HEAD
	
	Tim Pettersen        ++++++++++++++++++++++++++++++++++++++++++++++(79)
	Pierre-Etienne...    ---
	Jason Hinch          -----------------

Find blame delta over the last three weeks:

	$ git-guilt `git log --until="3 weeks ago" --format="%H" -n 1` HEAD
	
    Bryan Turner         ++++++++++++++++++++++++++++++++++++++++++++(6526)
    Adam Ahmed           ++++++++++++++++++++++++++++++++++++++++++++(1358)
    Charles O'Farrell    +++++++++++++++++++++++++++++++++++++++++++++(282)
    Pierre-Etienne...    +++++++++++++++++++++++++++++++++++++++++++++(281)
    Jonathan Poh         +++++++++++++++++++++++++++++++++++++++++++++(173)
    Jason Hinch          ++++++++++++++++++++++++++++++++++++++++++++++(97)
    Michael Heemskerk    ++++++++++++++++++++++++++++++++++++++++++++++(90)
    Brent Plump          +++++++++++++++++++++++++++
    Xu-Heng Tjhin        +++++
    Anna Buttfield       -
    Antoine Busch        -
    David Black          -
    Jared Wyles          -   
    Matthew Watson       ------------
    Michael McGlynn      ------------
    Dariusz Kordonski    ------------------
    Seb Ruiz             ---------------------------
    Conor MacNeill       --------------------------------------
    Geoff Crain          -------------------------------------------
    Michael Studman      ---------------------------------------------(-82)
    Tim Pettersen        --------------------------------------------(-108)
    John Van Der Loo     --------------------------------------------(-246)
    Thomas Bright        --------------------------------------------(-324)

Find blame delta for a topic branch:

	$ git guilt `git merge-base master my-topic-branch` my-topic-branch
	
	Xu-Heng Tjhin        +++++++++++++++++++++++++++++++++++++++++++++(209)
	Jason Hinch          -
	Michael McGlynn      -
	John Van Der Loo     --
	Jonathan Poh         ------
	Seb Ruiz             ----------
	Adam Ahmed           ---------------------------------------------(-98)

Find blame for the entire repository tree on master:
	
    $ git guilt -a master

    Tim Pettersen           456
    Richard Howard          3
