#!/bin/bash

echo "Pulling latest changes from origin..."
git pull origin master

if [ $? -eq 0 ]; then
    echo "Pull successful!"
else
    echo "Pull failed. Please check your git status and try again."
fi 