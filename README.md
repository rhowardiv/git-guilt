# git-guilt

Calculates the change in blame between two revisions.

## Usage

    git-guilt [<options>] <since> <until>

    Options:

      -h, --help     output usage information
      -V, --version  output the version number
      -e, --email    display author emails instead of names
      -d, --debug    output debug information
      
## Installation

- Install [Git](http://git-scm.com/), [Node.js](http://nodejs.org/) (tested against v0.10.3) and [npm](https://npmjs.org/)
- Run ``npm install -g git-guilt``. You may need ``sudo``.
- Run ``git-guilt HEAD~1 HEAD`` in any git repository to see the blame delta for the last commit.

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

Find blame delta over the last nine months:

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


	
	