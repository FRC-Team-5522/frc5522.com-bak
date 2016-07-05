#!/bin/bash
while true; do
    cd ~/bin
    node frc5522.com.js
    cd ~/frc5522.com
    sudo -u gxy git pull
done
