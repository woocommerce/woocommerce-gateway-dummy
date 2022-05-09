#!/usr/bin/env bash

# Check for required version.
WPCLI_VERSION=`wp cli version | cut -f2 -d' '`
if [ ${WPCLI_VERSION:0:1} -lt "2" -o ${WPCLI_VERSION:0:1} -eq "2" -a ${WPCLI_VERSION:2:1} -lt "1" ]; then
	echo WP-CLI version 2.1.0 or greater is required to make JSON translation files
	exit
fi

# HELPERS.
GREEN='\033[0;32m'
GREY='\033[0;38m'
NC='\033[0m' # No Color
UNDERLINE_START='\e[4m'
UNDERLINE_STOP='\e[0m'

# Substitute JS source references with build references.
for T in `find languages -name "*.pot"`
	do
		echo -e "\n${GREY}${UNDERLINE_START}Fixing references for: ${T}${UNDERLINE_STOP}${NC}"
		sed \
			-e 's/ resources\/js\/frontend\/[^:]*:/ assets\/frontend\/blocks.js:/gp' \
			$T | uniq > $T-build

		rm $T
		mv $T-build $T
		echo -e "${GREEN}Done${NC}"
	done
