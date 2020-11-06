#!/bin/bash
#
# shortcut script to call the script to create the zones with the same flags
#


current_log="logs/create_zones.log"
last_log=$(ls -tr logs/create_zones.*.log | grep -E "[0-9]" | tail -1)
last_number=$(echo $last_log | grep -oE "[0-9]+")
new_number=$(bc <<< "${last_number} + 1")
move_to="logs/create_zones.${new_number}.log"
mv $current_log $move_to
date > $current_log
LOG_LEVEL=DEBUG time node ./create_hosted_zones.js \
         --domain_name testzone.com \
         --name_server ns-1617.awsdns-10.co.uk. \
         --bucket_url google.com. \
         --max_tries 10 > $current_log 2>&1

