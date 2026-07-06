#!/bin/bash

# Exit if no commit message was provided
if [ -z "$1" ]; then
  echo "Error: You must provide a commit message."
  exit 1
fi

COMMIT_MSG="$1"

echo "Building frontend..."
cd asthma-app/frontend
npm run build
cd ../../

echo "Pushing docs/ to gh-pages..."
git subtree push --prefix asthma-app/frontend/docs origin gh-pages

echo "Committing to current branch..."
git add *
git commit -m "$COMMIT_MSG"
git push

echo "Done."