#!/bin/bash
i=1
while [ $i -le 20 ]; do echo bobobobbobobobbobobobobobobobobobobobobolog$i>> ../log_user_kill.txt; sleep 2;i=$((i+1)); done 
sleep 200
echo bobobobbobobobbobobobobobobobobobobobobolog$i>> ../log_user_kill.txt
echo end >> ../log_user_kill.txt

