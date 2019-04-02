
import pandas as pd
import sys, math

___doc___ = """
*********************************************************************
Mapping Genes to GWAS Traits
*********************************************************************

Command-line Usage:
    python {} <GWAS trait file name>

    <GWAS trait file name>: The filtered (p-value <= 5e-8) GWAS trait file.

Description:
This script links genes to GWAS traits based on a user-provided GWAS trait file, 
which provides variants significantly (p-value <= 5e-8) associated with the trait.
A gene is considered associated with a GWAS trait when a significant vairant is found within 1Mb distance.

Author: Katherine Huang
Contact: khhuang@broadinstitute.org

-----------------------------------------------------------------------------------------

TODO: None

"""
__author__ = "Katherine Huang"

# declaration of variables
gene_file = "V8.genes.tsv"
phenotype_file = "GTEx_V8_GWAS_Share.tsv"
gwas_file = None

# import In-house modules

def evaluateArg(argv):
    if len(argv) < 2 or argv[1] == '-h':
        sys.stderr.write(___doc___.format(argv[0]))
        sys.exit(1)
    else:
        gwas_file = argv[1]
    return gwas_file

def main(argv):
    gwas_file = evaluateArg(argv)
    gwas_df = pd.read_csv(gwas_file, sep="\t", index_col=2) # indexed by chromosome
    # build a dictionary of gene dataframes indexed by chromosome
    gene_df = pd.read_csv(gene_file, sep="\t")
    gene_df.set_index(keys=['chromosome'], drop=False, inplace=True) # indexed by chromosome, and do not drop the column
    gene_df.sort_values(by=['chromosome', 'tss'])
    genes_grouped_by_chr = dict(tuple(gene_df.groupby('chromosome'))) # split the gene_df into multiple df indexed by chromosome

    # find the trait description
    gwas_ori_fname = gwas_file.split("/")[-1].replace("filtered.txt", "txt.gz")
    phenotype_df = pd.read_csv(phenotype_file, sep="\t", index_col=1) # indexed by file name
    trait = phenotype_df.loc[gwas_ori_fname].Phenotype

    # trait associated genes
    mapped_genes = {} # indexed by gencodeId, value: the best variant object with the smallest p-value

    for index, row in gwas_df.iterrows(): # for each variant
        min_dist = 1e6
        closest_gene = None
        genes_on_chr = genes_grouped_by_chr[index] # filter genes based on the same chromosome as the gwas variants

        filtered_genes = genes_on_chr[genes_on_chr['tss'].between(row.position-1e6, row.position+1e6, inclusive=True)]
        # print filtered_genes.shape
        for index2, row2 in filtered_genes.iterrows():
            dist = math.fabs(row.position-row2.tss)
            if dist < min_dist:
                min_dist = dist
                closest_gene = row2

        if closest_gene.gencodeId in mapped_genes:
            if mapped_genes[closest_gene.gencodeId].pvalue > row.pvalue:
                mapped_genes[closest_gene.gencodeId] = row # assign the new variant to the associated gene for finding the smallest p-value
        else:
            mapped_genes[closest_gene.gencodeId] = row

    for gencodeId, variant in mapped_genes.items():
        print "\t".join([gencodeId, str(variant.pvalue), variant.panel_variant_id, trait])


if __name__ == '__main__':
    main(sys.argv)
