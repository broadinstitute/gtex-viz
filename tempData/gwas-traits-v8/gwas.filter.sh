#!/bin/bash
fname=$1
fpath="/xchip/gtex/resources/V8_release/gwas_imputed/"
file="$fpath${fname}.txt.gz"

echo "$file"
zcat $file | perl -lne '@t=split /\t/; print if $t[10]<=5e-8' > $1.filtered.txt
