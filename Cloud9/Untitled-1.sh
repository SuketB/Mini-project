




for i in ${!HOSTS[*]} ;
 do
    username=$1
    ip=$2
    rasbpassword=$3
    port=22

    #check whether logging into android or not
    if [ "$username" == "u0_a281" ]; then
    port=8022
    
    
    fi

    sshpass -p $rasbpassword ssh -p $port -t -t -oStrictHostKeyChecking=no $username@$ip << EOF
        shutdown now    
done

