#!/bin/bash

echo "Pulling latest changes from origin..."
# Get the current branch name
current_branch=$(git rev-parse --abbrev-ref HEAD)
git pull origin $current_branch

if [ $? -eq 0 ]; then
    echo "Pull successful!"
else
    echo "Pull failed. Please check your git status and try again."
fi 