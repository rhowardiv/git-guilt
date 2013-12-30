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

	$ git-guilt `git log --until="9 months ago" --format="%H" -n 1` HEAD
	
	Bryan Turner            +++++++++++++++++++++++++++++++++++++++++++(18122)
	Jason Hinch             +++++++++++++++++++++++++++++++++++++++++++(12495)
	Dariusz Kordonski       +++++++++++++++++++++++++++++++++++++++++++(12181)
	Cintia Calvo            ++++++++++++++++++++++++++++++++++++++++++++++(85)
	Nicola Paolucci         ++++++++++++++++++++++++++++++++++++++++++++++(73)
	Kostya Marchenko        +++++++++++++++++++++++++++++++++++++++++++++
	Paul Watson             ++
	Jesper Särnesjö         +
	David Rizzuto           -
	Steve Hetland           -
	Min'an Tan              ----
	Joseph Walton           ---------
	Matt Bond               ------------------------------
	Alex Hennecke           ------------------------------------------------
	Brendan Humphreys       ---------------------------------------------(-51)
	Tom Davies              ---------------------------------------------(-63)
	Pi Songsiritat          ---------------------------------------------(-78)
	Seb Ruiz                --------------------------------------------(-205)
	Conor MacNeill          --------------------------------------------(-263)
	Ian Grunert             --------------------------------------------(-278)
	Stefan Saasen           --------------------------------------------(-668)
	Tim Pettersen           -------------------------------------------(-1164)
	Michael McGlynn         -------------------------------------------(-2452)

Find blame delta for a topic branch:

	$ git guilt `git merge-base master my-topic-branch` my-topic-branch
	
	Xu-Heng Tjhin        +++++++++++++++++++++++++++++++++++++++++++++(209)
	Jason Hinch          -
	Michael McGlynn      -
	John Van Der Loo     --
	Jonathan Poh         ------
	Seb Ruiz             ----------
	Adam Ahmed           ---------------------------------------------(-98)


	
	