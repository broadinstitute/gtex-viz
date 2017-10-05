import pandas
import numpy as np
from scipy.cluster.hierarchy import linkage, to_tree
from scipy.cluster.hierarchy import cophenet
from scipy.spatial.distance import pdist
import sys

def test_clustering(z, d):
    # checks the Cophenetic Correlation Coefficient of the clustering results.
    # this compares the actual pairwise distances to those implied by the hierarchical clustering.
    # the closer the value is to 1, the better the clustering preserves the original distances.
    c, coph_dists = cophenet(z, pdist(d))
    sys.stderr.write("The Cophenetic Correlation Coefficient is " + str(c) + "\n")

def get_newick(node, newick, parent_dist, leaf_names):
    # reports the tree structure in the Newick format
    # based on a method I found on stack overflow
    # a recursive function: depth-first search, pre-order traversal
    if node.is_leaf():  # leaf nodes
        return "%s:%.2f%s" % (leaf_names[node.id], parent_dist - node.dist, newick)
    else:
        if len(newick) == 0:  # the root node
            newick = ");"
        else: # internal nodes
            newick = "):%.2f%s" %(parent_dist - node.dist, newick)

        # left child node
        newick = get_newick(node.get_left(), newick, node.dist, leaf_names)

        # right child node
        newick = get_newick(node.get_right(), "," + newick, node.dist, leaf_names)

        newick = "(" + newick

        return newick

def cluster(data_frame, label_column, data_column, n):
    '''
    performs the hierarchical clustering
    reports the tree structure in Newick format in STDOUT
    '''

    # makes sure the data frame is sorted by the label_column
    d = data_frame.sort_values(by=[label_column])

    # generates the input matrix
    m = np.reshape(d.as_matrix(columns=[data_column]), (-1, n))

    # the Ward variance minimization algorithm.
    clustering_method = "ward"
    Z = linkage(m, clustering_method)

    # tests the clustering results
    test_clustering(Z, m)
    leaf_labels = df[label_col].unique()

    # parses the tree and generates the output in the Newick format
    root = to_tree(Z, False)
    print get_newick(root, "", root.dist, leaf_labels)

if __name__ == '__main__':

    data_file = "~/Sites/expressMap/genes.median.tpm.csv"

    df = pandas.read_csv(data_file, sep="\t")
    data_col = "medianTPM"
    label_col = "geneSymbol"
    N = 53
    cluster(df,label_col, data_col, N)

    data_col = "medianTPM"



