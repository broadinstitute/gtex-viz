var plotviz = (function (plotviz) {
    plotviz.lineTestInput = {
  "generpkm": {
    "Adipose - Subcutaneous": {
      "high_whisker": 30.433, 
      "low_whisker": 6.126, 
      "median": 17.544, 
      "num_samples": 128, 
      "outliers": [
        32.647, 
        33.175, 
        40.132, 
        33.57, 
        41.017
      ], 
      "q1": 13.879, 
      "q3": 21.001
    }, 
    "Adipose - Visceral (Omentum)": {
      "high_whisker": 24.893, 
      "low_whisker": 6.646, 
      "median": 12.154, 
      "num_samples": 31, 
      "outliers": [
        30.339
      ], 
      "q1": 9.54, 
      "q3": 15.95
    }, 
    "Adrenal Gland": {
      "high_whisker": 11.603, 
      "low_whisker": 3.194, 
      "median": 8.13, 
      "num_samples": 52, 
      "outliers": [], 
      "q1": 6.284, 
      "q3": 9.454
    }, 
    "Artery - Aorta": {
      "high_whisker": 12.27, 
      "low_whisker": 4.46, 
      "median": 7.691, 
      "num_samples": 82, 
      "outliers": [
        16.131
      ], 
      "q1": 6.459, 
      "q3": 8.992
    }, 
    "Artery - Coronary": {
      "high_whisker": 9.951, 
      "low_whisker": 3.591, 
      "median": 6.585, 
      "num_samples": 44, 
      "outliers": [
        13.317, 
        12.541
      ], 
      "q1": 5.606, 
      "q3": 8.097
    }, 
    "Artery - Tibial": {
      "high_whisker": 19.163, 
      "low_whisker": 5.84, 
      "median": 11.579, 
      "num_samples": 137, 
      "outliers": [
        21.135, 
        22.953, 
        24.833, 
        25.152, 
        20.533
      ], 
      "q1": 9.886, 
      "q3": 13.733
    }, 
    "Bladder": {
      "high_whisker": 14.02, 
      "low_whisker": 6.696, 
      "median": 9.439, 
      "num_samples": 11, 
      "outliers": [], 
      "q1": 8.811, 
      "q3": 11.052
    }, 
    "Brain - Amygdala": {
      "high_whisker": 6.444, 
      "low_whisker": 1.295, 
      "median": 3.577, 
      "num_samples": 26, 
      "outliers": [], 
      "q1": 2.656, 
      "q3": 4.491
    }, 
    "Brain - Anterior cingulate cortex (BA24)": {
      "high_whisker": 4.909, 
      "low_whisker": 0.971, 
      "median": 2.412, 
      "num_samples": 22, 
      "outliers": [
        7.883
      ], 
      "q1": 1.781, 
      "q3": 3.842
    }, 
    "Brain - Caudate (basal ganglia)": {
      "high_whisker": 7.671, 
      "low_whisker": 2.36, 
      "median": 5.197, 
      "num_samples": 36, 
      "outliers": [
        11.373
      ], 
      "q1": 4.155, 
      "q3": 6.225
    }, 
    "Brain - Cerebellar Hemisphere": {
      "high_whisker": 2.329, 
      "low_whisker": 0.284, 
      "median": 0.969, 
      "num_samples": 29, 
      "outliers": [
        3.944
      ], 
      "q1": 0.699, 
      "q3": 1.596
    }, 
    "Brain - Cerebellum": {
      "high_whisker": 5.03, 
      "low_whisker": 0.51, 
      "median": 2.494, 
      "num_samples": 31, 
      "outliers": [], 
      "q1": 1.539, 
      "q3": 3.065
    }, 
    "Brain - Cortex": {
      "high_whisker": 6.023, 
      "low_whisker": 0.797, 
      "median": 2.91, 
      "num_samples": 25, 
      "outliers": [], 
      "q1": 2.049, 
      "q3": 4.128
    }, 
    "Brain - Frontal Cortex (BA9)": {
      "high_whisker": 6.059, 
      "low_whisker": 0.855, 
      "median": 2.669, 
      "num_samples": 28, 
      "outliers": [], 
      "q1": 1.89, 
      "q3": 4.023
    }, 
    "Brain - Hippocampus": {
      "high_whisker": 5.071, 
      "low_whisker": 0.821, 
      "median": 2.46, 
      "num_samples": 28, 
      "outliers": [], 
      "q1": 1.59, 
      "q3": 3.156
    }, 
    "Brain - Hypothalamus": {
      "high_whisker": 3.73, 
      "low_whisker": 0.66, 
      "median": 1.656, 
      "num_samples": 30, 
      "outliers": [
        8.736, 
        4.126
      ], 
      "q1": 1.308, 
      "q3": 2.322
    }, 
    "Brain - Nucleus accumbens (basal ganglia)": {
      "high_whisker": 7.196, 
      "low_whisker": 2.035, 
      "median": 4.953, 
      "num_samples": 32, 
      "outliers": [
        9.769
      ], 
      "q1": 4.107, 
      "q3": 6.228
    }, 
    "Brain - Putamen (basal ganglia)": {
      "high_whisker": 6.129, 
      "low_whisker": 1.325, 
      "median": 3.665, 
      "num_samples": 24, 
      "outliers": [
        6.865
      ], 
      "q1": 3.006, 
      "q3": 4.399
    }, 
    "Brain - Spinal cord (cervical c-1)": {
      "high_whisker": 1.585, 
      "low_whisker": 0.459, 
      "median": 0.89, 
      "num_samples": 19, 
      "outliers": [
        2.809
      ], 
      "q1": 0.653, 
      "q3": 1.129
    }, 
    "Brain - Substantia nigra": {
      "high_whisker": 3.554, 
      "low_whisker": 0.93, 
      "median": 1.942, 
      "num_samples": 27, 
      "outliers": [
        4.495, 
        6.912
      ], 
      "q1": 1.576, 
      "q3": 2.67
    }, 
    "Breast - Mammary Tissue": {
      "high_whisker": 28.847, 
      "low_whisker": 6.678, 
      "median": 15.072, 
      "num_samples": 66, 
      "outliers": [], 
      "q1": 11.469, 
      "q3": 19.095
    }, 
    "Cells - EBV-transformed lymphocytes": {
      "high_whisker": 0.154, 
      "low_whisker": 0.006, 
      "median": 0.07, 
      "num_samples": 54, 
      "outliers": [
        0.315, 
        0.351, 
        0.319, 
        0.464, 
        0.366, 
        0.398, 
        1.1
      ], 
      "q1": 0.038, 
      "q3": 0.115
    }, 
    "Cells - Transformed fibroblasts": {
      "high_whisker": 30.769, 
      "low_whisker": 5.936, 
      "median": 18.992, 
      "num_samples": 155, 
      "outliers": [], 
      "q1": 15.236, 
      "q3": 22.251
    }, 
    "Cervix - Ectocervix": {
      "high_whisker": 19.664, 
      "low_whisker": 8.063, 
      "median": 13.805, 
      "num_samples": 6, 
      "outliers": [], 
      "q1": 9.485, 
      "q3": 17.736
    }, 
    "Cervix - Endocervix": {
      "high_whisker": 20.091, 
      "low_whisker": 8.362, 
      "median": 12.34, 
      "num_samples": 3, 
      "outliers": [], 
      "q1": 10.351, 
      "q3": 16.215
    }, 
    "Colon - Sigmoid": {
      "high_whisker": 9.83, 
      "low_whisker": 6.241, 
      "median": 7.871, 
      "num_samples": 13, 
      "outliers": [
        13.548
      ], 
      "q1": 6.961, 
      "q3": 8.424
    }, 
    "Colon - Transverse": {
      "high_whisker": 10.304, 
      "low_whisker": 3.508, 
      "median": 6.844, 
      "num_samples": 61, 
      "outliers": [
        10.916, 
        12.91
      ], 
      "q1": 5.921, 
      "q3": 7.903
    }, 
    "Esophagus - Gastroesophageal Junction": {
      "high_whisker": 15.761, 
      "low_whisker": 10.937, 
      "median": 12.364, 
      "num_samples": 22, 
      "outliers": [
        9.56
      ], 
      "q1": 12.02, 
      "q3": 13.604
    }, 
    "Esophagus - Mucosa": {
      "high_whisker": 18.481, 
      "low_whisker": 5.697, 
      "median": 12.069, 
      "num_samples": 106, 
      "outliers": [
        20.515, 
        4.229, 
        19.914, 
        18.983
      ], 
      "q1": 10.293, 
      "q3": 13.59
    }, 
    "Esophagus - Muscularis": {
      "high_whisker": 19.231, 
      "low_whisker": 7.828, 
      "median": 12.856, 
      "num_samples": 99, 
      "outliers": [
        25.466
      ], 
      "q1": 11.004, 
      "q3": 14.406
    }, 
    "Fallopian Tube": {
      "high_whisker": 11.317, 
      "low_whisker": 8.29, 
      "median": 9.825, 
      "num_samples": 6, 
      "outliers": [
        14.206
      ], 
      "q1": 9.265, 
      "q3": 11.022
    }, 
    "Heart - Atrial Appendage": {
      "high_whisker": 4.692, 
      "low_whisker": 1.237, 
      "median": 3.045, 
      "num_samples": 38, 
      "outliers": [
        5.597
      ], 
      "q1": 2.4, 
      "q3": 3.551
    }, 
    "Heart - Left Ventricle": {
      "high_whisker": 3.69, 
      "low_whisker": 0.764, 
      "median": 1.895, 
      "num_samples": 95, 
      "outliers": [
        6.135, 
        3.826, 
        8.0, 
        3.771, 
        4.729, 
        3.86, 
        8.423, 
        4.679, 
        4.977, 
        5.449
      ], 
      "q1": 1.51, 
      "q3": 2.385
    }, 
    "Kidney - Cortex": {
      "high_whisker": 5.748, 
      "low_whisker": 1.583, 
      "median": 4.155, 
      "num_samples": 8, 
      "outliers": [
        14.253
      ], 
      "q1": 2.49, 
      "q3": 5.184
    }, 
    "Liver": {
      "high_whisker": 18.913, 
      "low_whisker": 6.607, 
      "median": 10.459, 
      "num_samples": 34, 
      "outliers": [], 
      "q1": 8.161, 
      "q3": 14.324
    }, 
    "Lung": {
      "high_whisker": 19.61, 
      "low_whisker": 3.272, 
      "median": 9.389, 
      "num_samples": 133, 
      "outliers": [
        19.926
      ], 
      "q1": 7.068, 
      "q3": 12.167
    }, 
    "Minor Salivary Gland": {
      "high_whisker": 17.223, 
      "low_whisker": 14.23, 
      "median": 15.269, 
      "num_samples": 5, 
      "outliers": [], 
      "q1": 15.058, 
      "q3": 16.104
    }, 
    "Muscle - Skeletal": {
      "high_whisker": 8.449, 
      "low_whisker": 0.865, 
      "median": 3.476, 
      "num_samples": 157, 
      "outliers": [
        36.188, 
        12.092, 
        8.577, 
        10.167, 
        9.387, 
        9.925
      ], 
      "q1": 2.493, 
      "q3": 4.914
    }, 
    "Nerve - Tibial": {
      "high_whisker": 23.758, 
      "low_whisker": 5.562, 
      "median": 14.951, 
      "num_samples": 114, 
      "outliers": [
        31.278, 
        30.85, 
        25.339
      ], 
      "q1": 12.653, 
      "q3": 17.668
    }, 
    "Ovary": {
      "high_whisker": 9.744, 
      "low_whisker": 4.131, 
      "median": 6.7, 
      "num_samples": 35, 
      "outliers": [
        3.319
      ], 
      "q1": 6.098, 
      "q3": 7.594
    }, 
    "Pancreas": {
      "high_whisker": 9.634, 
      "low_whisker": 1.828, 
      "median": 4.713, 
      "num_samples": 65, 
      "outliers": [
        10.691
      ], 
      "q1": 3.815, 
      "q3": 6.155
    }, 
    "Pituitary": {
      "high_whisker": 2.186, 
      "low_whisker": 0.802, 
      "median": 1.58, 
      "num_samples": 22, 
      "outliers": [
        2.68
      ], 
      "q1": 1.23, 
      "q3": 1.704
    }, 
    "Prostate": {
      "high_whisker": 22.15, 
      "low_whisker": 5.681, 
      "median": 10.755, 
      "num_samples": 42, 
      "outliers": [
        29.647
      ], 
      "q1": 8.015, 
      "q3": 14.095
    }, 
    "Skin - Not Sun Exposed (Suprapubic)": {
      "high_whisker": 46.056, 
      "low_whisker": 19.455, 
      "median": 31.149, 
      "num_samples": 41, 
      "outliers": [], 
      "q1": 26.736, 
      "q3": 35.059
    }, 
    "Skin - Sun Exposed (Lower leg)": {
      "high_whisker": 50.644, 
      "low_whisker": 15.446, 
      "median": 30.644, 
      "num_samples": 126, 
      "outliers": [
        59.898, 
        57.723, 
        52.19
      ], 
      "q1": 26.7, 
      "q3": 36.805
    }, 
    "Small Intestine - Terminal Ileum": {
      "high_whisker": 10.487, 
      "low_whisker": 2.012, 
      "median": 5.462, 
      "num_samples": 17, 
      "outliers": [], 
      "q1": 4.49, 
      "q3": 6.912
    }, 
    "Spleen": {
      "high_whisker": 5.308, 
      "low_whisker": 0.888, 
      "median": 2.63, 
      "num_samples": 34, 
      "outliers": [], 
      "q1": 1.683, 
      "q3": 3.503
    }, 
    "Stomach": {
      "high_whisker": 11.087, 
      "low_whisker": 1.371, 
      "median": 5.877, 
      "num_samples": 81, 
      "outliers": [
        12.437, 
        13.281, 
        12.654, 
        14.238, 
        12.718
      ], 
      "q1": 4.695, 
      "q3": 7.712
    }, 
    "Testis": {
      "high_whisker": 5.217, 
      "low_whisker": 0.746, 
      "median": 2.458, 
      "num_samples": 60, 
      "outliers": [
        6.188
      ], 
      "q1": 1.799, 
      "q3": 3.207
    }, 
    "Thyroid": {
      "high_whisker": 16.277, 
      "low_whisker": 4.904, 
      "median": 9.566, 
      "num_samples": 120, 
      "outliers": [
        18.864, 
        16.527
      ], 
      "q1": 8.044, 
      "q3": 11.383
    }, 
    "Uterus": {
      "high_whisker": 11.926, 
      "low_whisker": 3.545, 
      "median": 6.623, 
      "num_samples": 36, 
      "outliers": [], 
      "q1": 5.156, 
      "q3": 9.062
    }, 
    "Vagina": {
      "high_whisker": 24.254, 
      "low_whisker": 8.821, 
      "median": 14.927, 
      "num_samples": 34, 
      "outliers": [], 
      "q1": 12.076, 
      "q3": 17.745
    }, 
    "Whole Blood": {
      "high_whisker": 0.093, 
      "low_whisker": 0.002, 
      "median": 0.031, 
      "num_samples": 191, 
      "outliers": [
        0.194, 
        0.367, 
        0.129, 
        0.292, 
        0.348, 
        0.231, 
        0.187, 
        0.239, 
        0.279, 
        0.14, 
        0.173, 
        0.976, 
        0.206, 
        0.26, 
        0.415, 
        0.11, 
        0.403, 
        0.125, 
        0.135, 
        0.656, 
        0.112, 
        0.175, 
        0.365, 
        1.748
      ], 
      "q1": 0.018, 
      "q3": 0.051
    }
  }, 
  "isoformrpkm": {
    "ENST00000275493": {
      "Adipose - Subcutaneous": {
        "high_whisker": 55.804, 
        "low_whisker": 10.277, 
        "median": 31.362, 
        "num_samples": 128, 
        "outliers": [
          61.849, 
          57.315, 
          75.524, 
          61.331, 
          75.43
        ], 
        "q1": 24.929, 
        "q3": 37.68
      }, 
      "Adipose - Visceral (Omentum)": {
        "high_whisker": 43.649, 
        "low_whisker": 11.293, 
        "median": 22.717, 
        "num_samples": 31, 
        "outliers": [
          56.081
        ], 
        "q1": 17.404, 
        "q3": 29.362
      }, 
      "Adrenal Gland": {
        "high_whisker": 21.318, 
        "low_whisker": 5.636, 
        "median": 14.546, 
        "num_samples": 52, 
        "outliers": [], 
        "q1": 11.299, 
        "q3": 17.259
      }, 
      "Artery - Aorta": {
        "high_whisker": 23.982, 
        "low_whisker": 8.729, 
        "median": 14.712, 
        "num_samples": 82, 
        "outliers": [
          31.118
        ], 
        "q1": 12.29, 
        "q3": 17.241
      }, 
      "Artery - Coronary": {
        "high_whisker": 19.795, 
        "low_whisker": 6.176, 
        "median": 12.649, 
        "num_samples": 44, 
        "outliers": [
          26.88, 
          25.94
        ], 
        "q1": 10.784, 
        "q3": 15.563
      }, 
      "Artery - Tibial": {
        "high_whisker": 35.214, 
        "low_whisker": 11.286, 
        "median": 21.769, 
        "num_samples": 137, 
        "outliers": [
          40.257, 
          45.726, 
          45.155, 
          45.446, 
          38.921
        ], 
        "q1": 18.942, 
        "q3": 25.844
      }, 
      "Bladder": {
        "high_whisker": 21.462, 
        "low_whisker": 12.829, 
        "median": 17.041, 
        "num_samples": 11, 
        "outliers": [
          26.74
        ], 
        "q1": 15.65, 
        "q3": 20.053
      }, 
      "Brain - Amygdala": {
        "high_whisker": 11.537, 
        "low_whisker": 1.881, 
        "median": 6.342, 
        "num_samples": 26, 
        "outliers": [], 
        "q1": 4.426, 
        "q3": 8.203
      }, 
      "Brain - Anterior cingulate cortex (BA24)": {
        "high_whisker": 9.159, 
        "low_whisker": 1.325, 
        "median": 4.282, 
        "num_samples": 22, 
        "outliers": [
          14.029
        ], 
        "q1": 3.053, 
        "q3": 6.303
      }, 
      "Brain - Caudate (basal ganglia)": {
        "high_whisker": 13.456, 
        "low_whisker": 4.313, 
        "median": 8.867, 
        "num_samples": 36, 
        "outliers": [
          19.885
        ], 
        "q1": 7.053, 
        "q3": 10.465
      }, 
      "Brain - Cerebellar Hemisphere": {
        "high_whisker": 3.811, 
        "low_whisker": 0.448, 
        "median": 1.607, 
        "num_samples": 29, 
        "outliers": [
          6.231
        ], 
        "q1": 1.04, 
        "q3": 2.613
      }, 
      "Brain - Cerebellum": {
        "high_whisker": 7.669, 
        "low_whisker": 0.873, 
        "median": 3.927, 
        "num_samples": 31, 
        "outliers": [], 
        "q1": 2.452, 
        "q3": 4.603
      }, 
      "Brain - Cortex": {
        "high_whisker": 10.446, 
        "low_whisker": 1.457, 
        "median": 5.226, 
        "num_samples": 25, 
        "outliers": [], 
        "q1": 3.692, 
        "q3": 6.636
      }, 
      "Brain - Frontal Cortex (BA9)": {
        "high_whisker": 11.209, 
        "low_whisker": 1.666, 
        "median": 4.934, 
        "num_samples": 28, 
        "outliers": [], 
        "q1": 3.575, 
        "q3": 6.648
      }, 
      "Brain - Hippocampus": {
        "high_whisker": 9.012, 
        "low_whisker": 1.103, 
        "median": 4.043, 
        "num_samples": 28, 
        "outliers": [], 
        "q1": 2.889, 
        "q3": 5.435
      }, 
      "Brain - Hypothalamus": {
        "high_whisker": 6.227, 
        "low_whisker": 1.312, 
        "median": 3.045, 
        "num_samples": 30, 
        "outliers": [
          6.797, 
          14.131, 
          7.554
        ], 
        "q1": 2.421, 
        "q3": 4.012
      }, 
      "Brain - Nucleus accumbens (basal ganglia)": {
        "high_whisker": 17.054, 
        "low_whisker": 3.715, 
        "median": 8.521, 
        "num_samples": 32, 
        "outliers": [], 
        "q1": 6.927, 
        "q3": 10.99
      }, 
      "Brain - Putamen (basal ganglia)": {
        "high_whisker": 10.787, 
        "low_whisker": 2.316, 
        "median": 6.251, 
        "num_samples": 24, 
        "outliers": [
          12.286
        ], 
        "q1": 5.245, 
        "q3": 7.605
      }, 
      "Brain - Spinal cord (cervical c-1)": {
        "high_whisker": 2.777, 
        "low_whisker": 0.743, 
        "median": 1.741, 
        "num_samples": 19, 
        "outliers": [
          4.257
        ], 
        "q1": 1.198, 
        "q3": 2.042
      }, 
      "Brain - Substantia nigra": {
        "high_whisker": 6.537, 
        "low_whisker": 1.558, 
        "median": 3.53, 
        "num_samples": 27, 
        "outliers": [
          8.069, 
          12.784
        ], 
        "q1": 2.691, 
        "q3": 4.818
      }, 
      "Breast - Mammary Tissue": {
        "high_whisker": 49.247, 
        "low_whisker": 12.094, 
        "median": 27.009, 
        "num_samples": 66, 
        "outliers": [], 
        "q1": 20.488, 
        "q3": 33.813
      }, 
      "Cells - EBV-transformed lymphocytes": {
        "high_whisker": 0.302, 
        "low_whisker": 0.017, 
        "median": 0.118, 
        "num_samples": 54, 
        "outliers": [
          0.546, 
          0.634, 
          0.567, 
          0.799, 
          0.587, 
          0.56, 
          1.927
        ], 
        "q1": 0.069, 
        "q3": 0.215
      }, 
      "Cells - Transformed fibroblasts": {
        "high_whisker": 60.517, 
        "low_whisker": 11.134, 
        "median": 37.467, 
        "num_samples": 155, 
        "outliers": [], 
        "q1": 30.288, 
        "q3": 44.897
      }, 
      "Cervix - Ectocervix": {
        "high_whisker": 35.524, 
        "low_whisker": 14.878, 
        "median": 25.433, 
        "num_samples": 6, 
        "outliers": [], 
        "q1": 16.536, 
        "q3": 32.851
      }, 
      "Cervix - Endocervix": {
        "high_whisker": 35.125, 
        "low_whisker": 15.844, 
        "median": 21.561, 
        "num_samples": 3, 
        "outliers": [], 
        "q1": 18.703, 
        "q3": 28.343
      }, 
      "Colon - Sigmoid": {
        "high_whisker": 18.604, 
        "low_whisker": 11.021, 
        "median": 14.312, 
        "num_samples": 13, 
        "outliers": [
          24.817
        ], 
        "q1": 13.027, 
        "q3": 15.977
      }, 
      "Colon - Transverse": {
        "high_whisker": 17.879, 
        "low_whisker": 6.192, 
        "median": 12.11, 
        "num_samples": 61, 
        "outliers": [
          18.799, 
          18.919, 
          22.771
        ], 
        "q1": 10.489, 
        "q3": 13.807
      }, 
      "Esophagus - Gastroesophageal Junction": {
        "high_whisker": 30.445, 
        "low_whisker": 18.138, 
        "median": 22.732, 
        "num_samples": 22, 
        "outliers": [], 
        "q1": 21.406, 
        "q3": 25.877
      }, 
      "Esophagus - Mucosa": {
        "high_whisker": 35.474, 
        "low_whisker": 11.157, 
        "median": 22.928, 
        "num_samples": 106, 
        "outliers": [
          8.46, 
          36.963, 
          36.466
        ], 
        "q1": 19.827, 
        "q3": 26.17
      }, 
      "Esophagus - Muscularis": {
        "high_whisker": 37.268, 
        "low_whisker": 14.617, 
        "median": 24.657, 
        "num_samples": 99, 
        "outliers": [
          49.29
        ], 
        "q1": 20.38, 
        "q3": 27.301
      }, 
      "Fallopian Tube": {
        "high_whisker": 21.21, 
        "low_whisker": 13.682, 
        "median": 18.188, 
        "num_samples": 6, 
        "outliers": [
          27.266
        ], 
        "q1": 16.952, 
        "q3": 20.607
      }, 
      "Heart - Atrial Appendage": {
        "high_whisker": 8.065, 
        "low_whisker": 2.272, 
        "median": 5.599, 
        "num_samples": 38, 
        "outliers": [
          9.669
        ], 
        "q1": 4.348, 
        "q3": 6.457
      }, 
      "Heart - Left Ventricle": {
        "high_whisker": 6.412, 
        "low_whisker": 1.396, 
        "median": 3.198, 
        "num_samples": 95, 
        "outliers": [
          10.635, 
          11.757, 
          8.467, 
          13.785, 
          6.947, 
          8.512, 
          6.51, 
          9.302
        ], 
        "q1": 2.732, 
        "q3": 4.228
      }, 
      "Kidney - Cortex": {
        "high_whisker": 9.683, 
        "low_whisker": 2.963, 
        "median": 7.268, 
        "num_samples": 8, 
        "outliers": [
          22.619
        ], 
        "q1": 4.172, 
        "q3": 8.824
      }, 
      "Liver": {
        "high_whisker": 36.412, 
        "low_whisker": 10.876, 
        "median": 19.895, 
        "num_samples": 34, 
        "outliers": [], 
        "q1": 14.845, 
        "q3": 25.405
      }, 
      "Lung": {
        "high_whisker": 34.525, 
        "low_whisker": 5.74, 
        "median": 15.713, 
        "num_samples": 133, 
        "outliers": [
          37.4
        ], 
        "q1": 11.361, 
        "q3": 21.323
      }, 
      "Minor Salivary Gland": {
        "high_whisker": 27.829, 
        "low_whisker": 27.626, 
        "median": 27.812, 
        "num_samples": 5, 
        "outliers": [
          31.62, 
          25.387
        ], 
        "q1": 27.626, 
        "q3": 27.829
      }, 
      "Muscle - Skeletal": {
        "high_whisker": 14.862, 
        "low_whisker": 1.628, 
        "median": 6.678, 
        "num_samples": 157, 
        "outliers": [
          60.391, 
          16.282, 
          23.344, 
          16.813, 
          19.896, 
          19.314, 
          19.539
        ], 
        "q1": 4.73, 
        "q3": 9.284
      }, 
      "Nerve - Tibial": {
        "high_whisker": 42.242, 
        "low_whisker": 9.938, 
        "median": 25.23, 
        "num_samples": 114, 
        "outliers": [
          50.986, 
          49.792, 
          44.533
        ], 
        "q1": 21.287, 
        "q3": 29.956
      }, 
      "Ovary": {
        "high_whisker": 16.138, 
        "low_whisker": 6.87, 
        "median": 11.679, 
        "num_samples": 35, 
        "outliers": [
          5.503
        ], 
        "q1": 10.17, 
        "q3": 13.248
      }, 
      "Pancreas": {
        "high_whisker": 17.138, 
        "low_whisker": 3.365, 
        "median": 8.742, 
        "num_samples": 62, 
        "outliers": [
          19.564
        ], 
        "q1": 6.325, 
        "q3": 11.147
      }, 
      "Pituitary": {
        "high_whisker": 3.675, 
        "low_whisker": 1.353, 
        "median": 2.671, 
        "num_samples": 22, 
        "outliers": [
          4.82
        ], 
        "q1": 2.081, 
        "q3": 2.964
      }, 
      "Prostate": {
        "high_whisker": 35.775, 
        "low_whisker": 9.484, 
        "median": 18.2, 
        "num_samples": 42, 
        "outliers": [
          48.55
        ], 
        "q1": 14.128, 
        "q3": 23.053
      }, 
      "Skin - Not Sun Exposed (Suprapubic)": {
        "high_whisker": 86.128, 
        "low_whisker": 36.135, 
        "median": 53.875, 
        "num_samples": 41, 
        "outliers": [], 
        "q1": 46.01, 
        "q3": 63.523
      }, 
      "Skin - Sun Exposed (Lower leg)": {
        "high_whisker": 91.102, 
        "low_whisker": 24.813, 
        "median": 52.768, 
        "num_samples": 126, 
        "outliers": [
          103.173, 
          103.968
        ], 
        "q1": 44.781, 
        "q3": 63.341
      }, 
      "Small Intestine - Terminal Ileum": {
        "high_whisker": 19.438, 
        "low_whisker": 3.301, 
        "median": 9.14, 
        "num_samples": 17, 
        "outliers": [], 
        "q1": 7.584, 
        "q3": 12.383
      }, 
      "Spleen": {
        "high_whisker": 9.724, 
        "low_whisker": 1.553, 
        "median": 4.455, 
        "num_samples": 34, 
        "outliers": [], 
        "q1": 3.014, 
        "q3": 6.163
      }, 
      "Stomach": {
        "high_whisker": 23.378, 
        "low_whisker": 2.501, 
        "median": 8.763, 
        "num_samples": 80, 
        "outliers": [
          25.319, 
          28.93
        ], 
        "q1": 6.947, 
        "q3": 13.914
      }, 
      "Testis": {
        "high_whisker": 8.465, 
        "low_whisker": 1.148, 
        "median": 3.934, 
        "num_samples": 60, 
        "outliers": [
          10.235
        ], 
        "q1": 2.98, 
        "q3": 5.295
      }, 
      "Thyroid": {
        "high_whisker": 26.709, 
        "low_whisker": 6.698, 
        "median": 15.124, 
        "num_samples": 120, 
        "outliers": [
          30.947, 
          27.157
        ], 
        "q1": 12.891, 
        "q3": 18.515
      }, 
      "Uterus": {
        "high_whisker": 22.63, 
        "low_whisker": 6.479, 
        "median": 11.996, 
        "num_samples": 36, 
        "outliers": [], 
        "q1": 9.749, 
        "q3": 16.477
      }, 
      "Vagina": {
        "high_whisker": 47.232, 
        "low_whisker": 15.904, 
        "median": 25.37, 
        "num_samples": 34, 
        "outliers": [], 
        "q1": 21.221, 
        "q3": 31.628
      }, 
      "Whole Blood": {
        "high_whisker": 0.155, 
        "low_whisker": 0.0, 
        "median": 0.052, 
        "num_samples": 190, 
        "outliers": [
          0.348, 
          0.566, 
          0.53, 
          0.598, 
          0.414, 
          0.31, 
          0.372, 
          0.431, 
          0.205, 
          0.284, 
          1.452, 
          0.347, 
          0.424, 
          0.742, 
          0.196, 
          0.727, 
          0.22, 
          0.239, 
          1.095, 
          0.175, 
          0.273, 
          0.653, 
          3.289
        ], 
        "q1": 0.033, 
        "q3": 0.086
      }
    }, 
    "ENST00000342916": {
      "Adipose - Subcutaneous": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 128, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Adipose - Visceral (Omentum)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 31, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Adrenal Gland": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 52, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Artery - Aorta": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 82, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Artery - Coronary": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 44, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Artery - Tibial": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 137, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Bladder": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 11, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Amygdala": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 26, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Anterior cingulate cortex (BA24)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 22, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Caudate (basal ganglia)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 36, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Cerebellar Hemisphere": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 29, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Cerebellum": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 31, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Cortex": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 25, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Frontal Cortex (BA9)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 28, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Hippocampus": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 28, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Hypothalamus": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 30, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Nucleus accumbens (basal ganglia)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 32, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Putamen (basal ganglia)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 24, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Spinal cord (cervical c-1)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 19, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Substantia nigra": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 27, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Breast - Mammary Tissue": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 66, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Cells - EBV-transformed lymphocytes": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 54, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Cells - Transformed fibroblasts": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 155, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Cervix - Ectocervix": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 6, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Cervix - Endocervix": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 3, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Colon - Sigmoid": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 13, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Colon - Transverse": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 61, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Esophagus - Gastroesophageal Junction": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 22, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Esophagus - Mucosa": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 106, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Esophagus - Muscularis": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 99, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Fallopian Tube": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 6, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Heart - Atrial Appendage": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 38, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Heart - Left Ventricle": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 95, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Kidney - Cortex": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 8, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Liver": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 34, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Lung": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 133, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Minor Salivary Gland": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 5, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Muscle - Skeletal": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 157, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Nerve - Tibial": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 114, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Ovary": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 35, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Pancreas": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 62, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Pituitary": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 22, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Prostate": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 42, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Skin - Not Sun Exposed (Suprapubic)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 41, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Skin - Sun Exposed (Lower leg)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 126, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Small Intestine - Terminal Ileum": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 17, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Spleen": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 34, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Stomach": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 80, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Testis": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 60, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Thyroid": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 120, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Uterus": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 36, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Vagina": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 34, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Whole Blood": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 190, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }
    }, 
    "ENST00000344576": {
      "Adipose - Subcutaneous": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 128, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Adipose - Visceral (Omentum)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 31, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Adrenal Gland": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 52, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Artery - Aorta": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 82, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Artery - Coronary": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 44, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Artery - Tibial": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 137, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Bladder": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 11, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Amygdala": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 26, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Anterior cingulate cortex (BA24)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 22, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Caudate (basal ganglia)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 36, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Cerebellar Hemisphere": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 29, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Cerebellum": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 31, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Cortex": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 25, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Frontal Cortex (BA9)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 28, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Hippocampus": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 28, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Hypothalamus": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 30, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Nucleus accumbens (basal ganglia)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 32, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Putamen (basal ganglia)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 24, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Spinal cord (cervical c-1)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 19, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Substantia nigra": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 27, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Breast - Mammary Tissue": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 66, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Cells - EBV-transformed lymphocytes": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 54, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Cells - Transformed fibroblasts": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 155, 
        "outliers": [
          0.144, 
          0.201
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Cervix - Ectocervix": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 6, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Cervix - Endocervix": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 3, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Colon - Sigmoid": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 13, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Colon - Transverse": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 61, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Esophagus - Gastroesophageal Junction": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 22, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Esophagus - Mucosa": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 106, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Esophagus - Muscularis": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 99, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Fallopian Tube": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 6, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Heart - Atrial Appendage": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 38, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Heart - Left Ventricle": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 95, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Kidney - Cortex": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 8, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Liver": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 34, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Lung": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 133, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Minor Salivary Gland": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 5, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Muscle - Skeletal": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 157, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Nerve - Tibial": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 114, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Ovary": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 35, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Pancreas": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 62, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Pituitary": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 22, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Prostate": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 42, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Skin - Not Sun Exposed (Suprapubic)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 41, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Skin - Sun Exposed (Lower leg)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 126, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Small Intestine - Terminal Ileum": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 17, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Spleen": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 34, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Stomach": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 80, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Testis": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 60, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Thyroid": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 120, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Uterus": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 36, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Vagina": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 34, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Whole Blood": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 190, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }
    }, 
    "ENST00000420316": {
      "Adipose - Subcutaneous": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 128, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Adipose - Visceral (Omentum)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 31, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Adrenal Gland": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 52, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Artery - Aorta": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 82, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Artery - Coronary": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 44, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Artery - Tibial": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 137, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Bladder": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 11, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Amygdala": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 26, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Anterior cingulate cortex (BA24)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 22, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Caudate (basal ganglia)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 36, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Cerebellar Hemisphere": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 29, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Cerebellum": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 31, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Cortex": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 25, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Frontal Cortex (BA9)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 28, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Hippocampus": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 28, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Hypothalamus": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 30, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Nucleus accumbens (basal ganglia)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 32, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Putamen (basal ganglia)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 24, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Spinal cord (cervical c-1)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 19, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Substantia nigra": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 27, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Breast - Mammary Tissue": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 66, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Cells - EBV-transformed lymphocytes": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 54, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Cells - Transformed fibroblasts": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 155, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Cervix - Ectocervix": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 6, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Cervix - Endocervix": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 3, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Colon - Sigmoid": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 13, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Colon - Transverse": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 61, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Esophagus - Gastroesophageal Junction": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 22, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Esophagus - Mucosa": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 106, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Esophagus - Muscularis": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 99, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Fallopian Tube": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 6, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Heart - Atrial Appendage": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 38, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Heart - Left Ventricle": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 95, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Kidney - Cortex": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 8, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Liver": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 34, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Lung": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 133, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Minor Salivary Gland": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 5, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Muscle - Skeletal": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 157, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Nerve - Tibial": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 114, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Ovary": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 35, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Pancreas": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 62, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Pituitary": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 22, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Prostate": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 42, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Skin - Not Sun Exposed (Suprapubic)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 41, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Skin - Sun Exposed (Lower leg)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 126, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Small Intestine - Terminal Ileum": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 17, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Spleen": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 34, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Stomach": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 80, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Testis": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 60, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Thyroid": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 120, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Uterus": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 36, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Vagina": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 34, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Whole Blood": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 190, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }
    }, 
    "ENST00000442591": {
      "Adipose - Subcutaneous": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 128, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Adipose - Visceral (Omentum)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 31, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Adrenal Gland": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 52, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Artery - Aorta": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 82, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Artery - Coronary": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 44, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Artery - Tibial": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 137, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Bladder": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 11, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Amygdala": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 26, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Anterior cingulate cortex (BA24)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 22, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Caudate (basal ganglia)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 36, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Cerebellar Hemisphere": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 29, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Cerebellum": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 31, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Cortex": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 25, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Frontal Cortex (BA9)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 28, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Hippocampus": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 28, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Hypothalamus": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 30, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Nucleus accumbens (basal ganglia)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 32, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Putamen (basal ganglia)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 24, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Spinal cord (cervical c-1)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 19, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Substantia nigra": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 27, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Breast - Mammary Tissue": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 66, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Cells - EBV-transformed lymphocytes": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 54, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Cells - Transformed fibroblasts": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 155, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Cervix - Ectocervix": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 6, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Cervix - Endocervix": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 3, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Colon - Sigmoid": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 13, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Colon - Transverse": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 61, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Esophagus - Gastroesophageal Junction": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 22, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Esophagus - Mucosa": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 106, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Esophagus - Muscularis": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 99, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Fallopian Tube": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 6, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Heart - Atrial Appendage": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 38, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Heart - Left Ventricle": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 95, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Kidney - Cortex": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 8, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Liver": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 34, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Lung": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 133, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Minor Salivary Gland": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 5, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Muscle - Skeletal": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 157, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Nerve - Tibial": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 114, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Ovary": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 35, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Pancreas": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 62, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Pituitary": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 22, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Prostate": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 42, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Skin - Not Sun Exposed (Suprapubic)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 41, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Skin - Sun Exposed (Lower leg)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 126, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Small Intestine - Terminal Ileum": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 17, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Spleen": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 34, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Stomach": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 80, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Testis": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 60, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Thyroid": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 120, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Uterus": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 36, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Vagina": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 34, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Whole Blood": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 190, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }
    }, 
    "ENST00000450046": {
      "Adipose - Subcutaneous": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 128, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Adipose - Visceral (Omentum)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 31, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Adrenal Gland": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 52, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Artery - Aorta": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 82, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Artery - Coronary": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 44, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Artery - Tibial": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 137, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Bladder": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 11, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Amygdala": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 26, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Anterior cingulate cortex (BA24)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 22, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Caudate (basal ganglia)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 36, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Cerebellar Hemisphere": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 29, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Cerebellum": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 31, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Cortex": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 25, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Frontal Cortex (BA9)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 28, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Hippocampus": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 28, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Hypothalamus": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 30, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Nucleus accumbens (basal ganglia)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 32, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Putamen (basal ganglia)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 24, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Spinal cord (cervical c-1)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 19, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Substantia nigra": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 27, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Breast - Mammary Tissue": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 66, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Cells - EBV-transformed lymphocytes": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 54, 
        "outliers": [
          0.031, 
          0.06
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Cells - Transformed fibroblasts": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 155, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Cervix - Ectocervix": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 6, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Cervix - Endocervix": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 3, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Colon - Sigmoid": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 13, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Colon - Transverse": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 61, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Esophagus - Gastroesophageal Junction": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 22, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Esophagus - Mucosa": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 106, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Esophagus - Muscularis": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 99, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Fallopian Tube": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 6, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Heart - Atrial Appendage": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 38, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Heart - Left Ventricle": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 95, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Kidney - Cortex": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 8, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Liver": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 34, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Lung": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 133, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Minor Salivary Gland": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 5, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Muscle - Skeletal": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 157, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Nerve - Tibial": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 114, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Ovary": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 35, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Pancreas": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 62, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Pituitary": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 22, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Prostate": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 42, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Skin - Not Sun Exposed (Suprapubic)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 41, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Skin - Sun Exposed (Lower leg)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 126, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Small Intestine - Terminal Ileum": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 17, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Spleen": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 34, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Stomach": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 80, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Testis": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 60, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Thyroid": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 120, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Uterus": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 36, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Vagina": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 34, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Whole Blood": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 190, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }
    }, 
    "ENST00000454757": {
      "Adipose - Subcutaneous": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 128, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Adipose - Visceral (Omentum)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 31, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Adrenal Gland": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 52, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Artery - Aorta": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 82, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Artery - Coronary": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 44, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Artery - Tibial": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 137, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Bladder": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 11, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Amygdala": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 26, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Anterior cingulate cortex (BA24)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 22, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Caudate (basal ganglia)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 36, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Cerebellar Hemisphere": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 29, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Cerebellum": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 31, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Cortex": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 25, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Frontal Cortex (BA9)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 28, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Hippocampus": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 28, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Hypothalamus": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 30, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Nucleus accumbens (basal ganglia)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 32, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Putamen (basal ganglia)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 24, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Spinal cord (cervical c-1)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 19, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Substantia nigra": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 27, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Breast - Mammary Tissue": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 66, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Cells - EBV-transformed lymphocytes": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 54, 
        "outliers": [
          0.01, 
          0.108, 
          0.034, 
          0.137, 
          0.175, 
          0.378
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Cells - Transformed fibroblasts": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 155, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Cervix - Ectocervix": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 6, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Cervix - Endocervix": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 3, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Colon - Sigmoid": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 13, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Colon - Transverse": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 61, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Esophagus - Gastroesophageal Junction": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 22, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Esophagus - Mucosa": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 106, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Esophagus - Muscularis": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 99, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Fallopian Tube": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 6, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Heart - Atrial Appendage": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 38, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Heart - Left Ventricle": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 95, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Kidney - Cortex": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 8, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Liver": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 34, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Lung": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 133, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Minor Salivary Gland": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 5, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Muscle - Skeletal": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 157, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Nerve - Tibial": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 114, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Ovary": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 35, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Pancreas": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 62, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Pituitary": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 22, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Prostate": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 42, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Skin - Not Sun Exposed (Suprapubic)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 41, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Skin - Sun Exposed (Lower leg)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 126, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Small Intestine - Terminal Ileum": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 17, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Spleen": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 34, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Stomach": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 80, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Testis": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 60, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Thyroid": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 120, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Uterus": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 36, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Vagina": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 34, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Whole Blood": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 190, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }
    }, 
    "ENST00000455089": {
      "Adipose - Subcutaneous": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 128, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Adipose - Visceral (Omentum)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 31, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Adrenal Gland": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 52, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Artery - Aorta": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 82, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Artery - Coronary": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 44, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Artery - Tibial": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 137, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Bladder": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 11, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Amygdala": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 26, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Anterior cingulate cortex (BA24)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 22, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Caudate (basal ganglia)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 36, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Cerebellar Hemisphere": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 29, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Cerebellum": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 31, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Cortex": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 25, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Frontal Cortex (BA9)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 28, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Hippocampus": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 28, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Hypothalamus": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 30, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Nucleus accumbens (basal ganglia)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 32, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Putamen (basal ganglia)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 24, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Spinal cord (cervical c-1)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 19, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Substantia nigra": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 27, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Breast - Mammary Tissue": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 66, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Cells - EBV-transformed lymphocytes": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 54, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Cells - Transformed fibroblasts": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 155, 
        "outliers": [
          0.115
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Cervix - Ectocervix": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 6, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Cervix - Endocervix": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 3, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Colon - Sigmoid": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 13, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Colon - Transverse": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 61, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Esophagus - Gastroesophageal Junction": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 22, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Esophagus - Mucosa": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 106, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Esophagus - Muscularis": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 99, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Fallopian Tube": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 6, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Heart - Atrial Appendage": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 38, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Heart - Left Ventricle": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 95, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Kidney - Cortex": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 8, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Liver": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 34, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Lung": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 133, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Minor Salivary Gland": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 5, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Muscle - Skeletal": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 157, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Nerve - Tibial": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 114, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Ovary": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 35, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Pancreas": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 62, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Pituitary": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 22, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Prostate": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 42, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Skin - Not Sun Exposed (Suprapubic)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 41, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Skin - Sun Exposed (Lower leg)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 126, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Small Intestine - Terminal Ileum": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 17, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Spleen": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 34, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Stomach": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 80, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Testis": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 60, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Thyroid": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 120, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Uterus": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 36, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Vagina": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 34, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Whole Blood": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 190, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }
    }, 
    "ENST00000459688": {
      "Adipose - Subcutaneous": {
        "high_whisker": 0.368, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 128, 
        "outliers": [
          0.692, 
          1.06, 
          0.395, 
          0.639, 
          1.022
        ], 
        "q1": 0.0, 
        "q3": 0.155
      }, 
      "Adipose - Visceral (Omentum)": {
        "high_whisker": 0.192, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 31, 
        "outliers": [
          0.337, 
          0.337, 
          0.317
        ], 
        "q1": 0.0, 
        "q3": 0.114
      }, 
      "Adrenal Gland": {
        "high_whisker": 0.236, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 52, 
        "outliers": [
          0.392, 
          0.534, 
          0.368, 
          0.596
        ], 
        "q1": 0.0, 
        "q3": 0.115
      }, 
      "Artery - Aorta": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 82, 
        "outliers": [
          0.297, 
          0.095, 
          0.121, 
          0.094, 
          0.127, 
          0.113, 
          0.217, 
          0.223, 
          0.173, 
          0.179, 
          0.152, 
          0.155, 
          0.181, 
          0.118, 
          0.231, 
          0.555
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Artery - Coronary": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 44, 
        "outliers": [
          0.121, 
          0.144, 
          0.139
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Artery - Tibial": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 137, 
        "outliers": [
          0.14, 
          0.255, 
          0.125, 
          0.084, 
          0.73, 
          0.372, 
          0.586, 
          0.272, 
          0.191, 
          0.094, 
          0.111, 
          0.12, 
          0.101, 
          0.134, 
          0.086, 
          0.204, 
          0.37, 
          0.172, 
          0.128, 
          0.293, 
          0.204, 
          0.241, 
          0.229, 
          0.19, 
          0.14, 
          0.133, 
          0.151, 
          0.136, 
          0.21
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Bladder": {
        "high_whisker": 0.18, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 11, 
        "outliers": [
          0.248, 
          0.394
        ], 
        "q1": 0.0, 
        "q3": 0.09
      }, 
      "Brain - Amygdala": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 26, 
        "outliers": [
          0.25, 
          0.111
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Anterior cingulate cortex (BA24)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 22, 
        "outliers": [
          0.133, 
          0.129, 
          0.135, 
          0.197
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Caudate (basal ganglia)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 36, 
        "outliers": [
          0.106, 
          0.166, 
          0.28, 
          0.316, 
          0.088, 
          0.13, 
          0.202, 
          0.101
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Cerebellar Hemisphere": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 29, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Cerebellum": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 31, 
        "outliers": [
          0.076, 
          0.133, 
          0.227
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Cortex": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 25, 
        "outliers": [
          0.104, 
          0.1
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Frontal Cortex (BA9)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 28, 
        "outliers": [
          0.139, 
          0.16, 
          0.106
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Hippocampus": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 28, 
        "outliers": [
          0.075, 
          0.161, 
          0.171, 
          0.284, 
          0.177
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Hypothalamus": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 30, 
        "outliers": [
          0.17, 
          0.164
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Nucleus accumbens (basal ganglia)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 32, 
        "outliers": [
          0.149, 
          0.075, 
          0.626
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Putamen (basal ganglia)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 24, 
        "outliers": [
          0.11, 
          0.1
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Spinal cord (cervical c-1)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 19, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Substantia nigra": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 27, 
        "outliers": [
          0.21, 
          0.188
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Breast - Mammary Tissue": {
        "high_whisker": 0.323, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 66, 
        "outliers": [
          0.546, 
          0.397, 
          0.405, 
          0.498, 
          0.596, 
          0.439, 
          0.362, 
          0.365
        ], 
        "q1": 0.0, 
        "q3": 0.14
      }, 
      "Cells - EBV-transformed lymphocytes": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 54, 
        "outliers": [
          0.363, 
          0.387
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Cells - Transformed fibroblasts": {
        "high_whisker": 1.461, 
        "low_whisker": 0.0, 
        "median": 0.248, 
        "num_samples": 155, 
        "outliers": [
          3.821, 
          3.247, 
          6.782, 
          4.47, 
          2.419, 
          2.154, 
          5.917, 
          3.485, 
          1.613, 
          2.263, 
          2.373, 
          6.131
        ], 
        "q1": 0.0, 
        "q3": 0.629
      }, 
      "Cervix - Ectocervix": {
        "high_whisker": 0.178, 
        "low_whisker": 0.0, 
        "median": 0.073, 
        "num_samples": 6, 
        "outliers": [
          1.292
        ], 
        "q1": 0.0, 
        "q3": 0.17
      }, 
      "Cervix - Endocervix": {
        "high_whisker": 0.171, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 3, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.086
      }, 
      "Colon - Sigmoid": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 13, 
        "outliers": [
          0.715
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Colon - Transverse": {
        "high_whisker": 0.374, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 61, 
        "outliers": [
          0.51, 
          0.428, 
          0.42
        ], 
        "q1": 0.0, 
        "q3": 0.163
      }, 
      "Esophagus - Gastroesophageal Junction": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 22, 
        "outliers": [
          0.384, 
          0.207, 
          0.543, 
          0.201, 
          0.223
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Esophagus - Mucosa": {
        "high_whisker": 0.499, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 106, 
        "outliers": [
          0.569, 
          0.75, 
          0.547, 
          0.662
        ], 
        "q1": 0.0, 
        "q3": 0.203
      }, 
      "Esophagus - Muscularis": {
        "high_whisker": 0.347, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 99, 
        "outliers": [
          0.859, 
          0.721, 
          0.409, 
          0.501
        ], 
        "q1": 0.0, 
        "q3": 0.154
      }, 
      "Fallopian Tube": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 6, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Heart - Atrial Appendage": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 38, 
        "outliers": [
          0.341, 
          0.13
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Heart - Left Ventricle": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 95, 
        "outliers": [
          0.13, 
          0.235, 
          0.377, 
          0.105, 
          0.091, 
          0.11, 
          0.437, 
          0.252, 
          0.126, 
          0.102, 
          0.107, 
          0.114
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Kidney - Cortex": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 8, 
        "outliers": [
          0.092, 
          0.161
        ], 
        "q1": 0.0, 
        "q3": 0.023
      }, 
      "Liver": {
        "high_whisker": 0.39, 
        "low_whisker": 0.0, 
        "median": 0.139, 
        "num_samples": 34, 
        "outliers": [
          0.466, 
          1.974
        ], 
        "q1": 0.0, 
        "q3": 0.184
      }, 
      "Lung": {
        "high_whisker": 0.333, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 133, 
        "outliers": [
          0.369, 
          0.425, 
          0.67
        ], 
        "q1": 0.0, 
        "q3": 0.135
      }, 
      "Minor Salivary Gland": {
        "high_whisker": 0.201, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 5, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.133
      }, 
      "Muscle - Skeletal": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 157, 
        "outliers": [
          0.117, 
          0.187, 
          0.074, 
          0.694, 
          0.387, 
          0.216, 
          0.255, 
          0.153, 
          0.075, 
          0.148, 
          0.356, 
          0.32, 
          0.106, 
          0.152, 
          0.187, 
          0.712
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Nerve - Tibial": {
        "high_whisker": 0.305, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 114, 
        "outliers": [
          0.392, 
          0.896, 
          0.919, 
          0.34, 
          0.556, 
          0.328, 
          1.102, 
          0.357, 
          0.649
        ], 
        "q1": 0.0, 
        "q3": 0.129
      }, 
      "Ovary": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 35, 
        "outliers": [
          0.248, 
          0.189, 
          0.19, 
          0.385, 
          0.148, 
          0.193, 
          0.222, 
          0.176
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Pancreas": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 62, 
        "outliers": [
          0.119, 
          0.127, 
          0.322, 
          0.116, 
          0.185, 
          0.236, 
          0.189, 
          0.163, 
          0.183, 
          0.197, 
          0.228, 
          0.192, 
          0.212, 
          0.202
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Pituitary": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 22, 
        "outliers": [
          0.123
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Prostate": {
        "high_whisker": 0.4, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 42, 
        "outliers": [
          1.384, 
          0.56, 
          0.717
        ], 
        "q1": 0.0, 
        "q3": 0.186
      }, 
      "Skin - Not Sun Exposed (Suprapubic)": {
        "high_whisker": 0.813, 
        "low_whisker": 0.0, 
        "median": 0.165, 
        "num_samples": 41, 
        "outliers": [
          1.29
        ], 
        "q1": 0.0, 
        "q3": 0.392
      }, 
      "Skin - Sun Exposed (Lower leg)": {
        "high_whisker": 0.914, 
        "low_whisker": 0.0, 
        "median": 0.152, 
        "num_samples": 126, 
        "outliers": [
          1.462, 
          1.114, 
          1.258, 
          1.13, 
          1.147, 
          0.942
        ], 
        "q1": 0.0, 
        "q3": 0.376
      }, 
      "Small Intestine - Terminal Ileum": {
        "high_whisker": 0.312, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 17, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.168
      }, 
      "Spleen": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 34, 
        "outliers": [
          0.161, 
          0.385
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Stomach": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 80, 
        "outliers": [
          0.108, 
          0.277, 
          0.274, 
          0.258, 
          0.126, 
          0.392, 
          0.182, 
          0.178, 
          0.394, 
          0.223, 
          0.192, 
          0.361, 
          0.172, 
          0.127, 
          0.242, 
          0.24, 
          0.224
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Testis": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 60, 
        "outliers": [
          0.218, 
          0.174
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Thyroid": {
        "high_whisker": 0.252, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 120, 
        "outliers": [
          0.299, 
          0.523, 
          0.908, 
          0.391, 
          0.717, 
          0.388, 
          0.498, 
          0.271
        ], 
        "q1": 0.0, 
        "q3": 0.106
      }, 
      "Uterus": {
        "high_whisker": 0.25, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 36, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.123
      }, 
      "Vagina": {
        "high_whisker": 0.405, 
        "low_whisker": 0.0, 
        "median": 0.133, 
        "num_samples": 34, 
        "outliers": [
          0.578, 
          0.609, 
          0.581
        ], 
        "q1": 0.0, 
        "q3": 0.186
      }, 
      "Whole Blood": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 190, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }
    }, 
    "ENST00000463948": {
      "Adipose - Subcutaneous": {
        "high_whisker": 0.294, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 128, 
        "outliers": [
          0.532, 
          0.348
        ], 
        "q1": 0.0, 
        "q3": 0.12
      }, 
      "Adipose - Visceral (Omentum)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 31, 
        "outliers": [
          0.116, 
          0.098, 
          0.096, 
          0.122, 
          0.114, 
          0.104, 
          0.11
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Adrenal Gland": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 52, 
        "outliers": [
          0.076, 
          0.119, 
          0.112, 
          0.134, 
          0.108, 
          0.103, 
          0.136
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Artery - Aorta": {
        "high_whisker": 0.233, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 82, 
        "outliers": [
          0.473, 
          0.414
        ], 
        "q1": 0.0, 
        "q3": 0.095
      }, 
      "Artery - Coronary": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 44, 
        "outliers": [
          0.089, 
          0.129, 
          0.13, 
          0.303, 
          0.137, 
          0.135, 
          0.274, 
          0.128, 
          0.232, 
          0.115
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Artery - Tibial": {
        "high_whisker": 0.188, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 137, 
        "outliers": [
          0.467, 
          0.386, 
          0.26, 
          0.279, 
          0.409, 
          0.314, 
          0.226, 
          0.458, 
          0.252, 
          0.522, 
          0.297, 
          0.234, 
          0.39
        ], 
        "q1": 0.0, 
        "q3": 0.085
      }, 
      "Bladder": {
        "high_whisker": 0.245, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 11, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.106
      }, 
      "Brain - Amygdala": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 26, 
        "outliers": [
          0.084, 
          0.155
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Anterior cingulate cortex (BA24)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 22, 
        "outliers": [
          0.1
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Caudate (basal ganglia)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 36, 
        "outliers": [
          0.068, 
          0.067, 
          0.164, 
          0.159, 
          0.082
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Cerebellar Hemisphere": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 29, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Cerebellum": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 31, 
        "outliers": [
          0.15
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Cortex": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 25, 
        "outliers": [
          0.115, 
          0.114
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Frontal Cortex (BA9)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 28, 
        "outliers": [
          0.09, 
          0.077
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Hippocampus": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 28, 
        "outliers": [
          0.111, 
          0.096
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Hypothalamus": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 30, 
        "outliers": [
          0.141
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Nucleus accumbens (basal ganglia)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 32, 
        "outliers": [
          0.207
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Putamen (basal ganglia)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 24, 
        "outliers": [
          0.086, 
          0.103
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Spinal cord (cervical c-1)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 19, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Substantia nigra": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 27, 
        "outliers": [
          0.183, 
          0.119
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Breast - Mammary Tissue": {
        "high_whisker": 0.248, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 66, 
        "outliers": [
          0.392, 
          0.25, 
          0.314
        ], 
        "q1": 0.0, 
        "q3": 0.1
      }, 
      "Cells - EBV-transformed lymphocytes": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 54, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Cells - Transformed fibroblasts": {
        "high_whisker": 0.358, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 155, 
        "outliers": [
          0.712, 
          0.373, 
          0.645, 
          0.393
        ], 
        "q1": 0.0, 
        "q3": 0.146
      }, 
      "Cervix - Ectocervix": {
        "high_whisker": 0.281, 
        "low_whisker": 0.0, 
        "median": 0.046, 
        "num_samples": 6, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.123
      }, 
      "Cervix - Endocervix": {
        "high_whisker": 0.186, 
        "low_whisker": 0.121, 
        "median": 0.144, 
        "num_samples": 3, 
        "outliers": [], 
        "q1": 0.133, 
        "q3": 0.165
      }, 
      "Colon - Sigmoid": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 13, 
        "outliers": [
          0.114
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Colon - Transverse": {
        "high_whisker": 0.222, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 61, 
        "outliers": [
          0.337
        ], 
        "q1": 0.0, 
        "q3": 0.113
      }, 
      "Esophagus - Gastroesophageal Junction": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 22, 
        "outliers": [
          0.157, 
          0.1, 
          0.113
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Esophagus - Mucosa": {
        "high_whisker": 0.307, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 106, 
        "outliers": [
          0.524, 
          0.342, 
          0.337, 
          0.376, 
          0.4
        ], 
        "q1": 0.0, 
        "q3": 0.126
      }, 
      "Esophagus - Muscularis": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 99, 
        "outliers": [
          0.141, 
          0.09, 
          0.08, 
          0.066, 
          0.113, 
          0.102, 
          0.083, 
          0.108, 
          0.121, 
          0.105, 
          0.102, 
          0.098, 
          0.138, 
          0.306, 
          0.126, 
          0.086, 
          0.129
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Fallopian Tube": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 6, 
        "outliers": [
          0.146
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Heart - Atrial Appendage": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 38, 
        "outliers": [
          0.195, 
          0.166, 
          0.217, 
          0.13
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Heart - Left Ventricle": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 95, 
        "outliers": [
          0.096, 
          0.054, 
          0.05, 
          0.124, 
          0.121, 
          0.182, 
          0.099, 
          0.067, 
          0.22
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Kidney - Cortex": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 8, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Liver": {
        "high_whisker": 0.133, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 34, 
        "outliers": [
          0.227, 
          0.296
        ], 
        "q1": 0.0, 
        "q3": 0.053
      }, 
      "Lung": {
        "high_whisker": 0.184, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 133, 
        "outliers": [
          0.202, 
          0.268, 
          0.324, 
          0.195, 
          0.228, 
          0.327, 
          0.402, 
          0.575, 
          0.192, 
          0.589, 
          0.279, 
          0.249, 
          0.21, 
          0.268
        ], 
        "q1": 0.0, 
        "q3": 0.076
      }, 
      "Minor Salivary Gland": {
        "high_whisker": 0.085, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 5, 
        "outliers": [
          0.253
        ], 
        "q1": 0.0, 
        "q3": 0.085
      }, 
      "Muscle - Skeletal": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 157, 
        "outliers": [
          0.354, 
          0.074, 
          0.119, 
          0.152, 
          0.127, 
          0.37, 
          0.137, 
          0.107, 
          0.234, 
          0.275, 
          0.122, 
          0.089, 
          0.383, 
          0.15, 
          0.176, 
          0.155, 
          0.137, 
          0.272, 
          0.059, 
          0.081, 
          0.092, 
          0.087, 
          0.105, 
          0.149, 
          0.182, 
          0.144, 
          0.151, 
          0.051, 
          0.065, 
          0.075, 
          0.088, 
          0.208, 
          0.105
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Nerve - Tibial": {
        "high_whisker": 0.248, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 114, 
        "outliers": [
          0.447, 
          0.279, 
          0.483, 
          0.505, 
          0.729, 
          0.345, 
          0.274, 
          0.258
        ], 
        "q1": 0.0, 
        "q3": 0.1
      }, 
      "Ovary": {
        "high_whisker": 0.071, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 35, 
        "outliers": [
          0.126, 
          0.14, 
          0.095, 
          0.111, 
          0.134, 
          0.125, 
          0.106
        ], 
        "q1": 0.0, 
        "q3": 0.033
      }, 
      "Pancreas": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 62, 
        "outliers": [
          0.118, 
          0.237, 
          0.091, 
          0.092, 
          0.105, 
          0.119, 
          0.242, 
          0.27, 
          0.108, 
          0.2
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Pituitary": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 22, 
        "outliers": [
          0.044
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Prostate": {
        "high_whisker": 0.297, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 42, 
        "outliers": [
          0.448, 
          0.433, 
          0.327, 
          0.444
        ], 
        "q1": 0.0, 
        "q3": 0.126
      }, 
      "Skin - Not Sun Exposed (Suprapubic)": {
        "high_whisker": 0.741, 
        "low_whisker": 0.0, 
        "median": 0.14, 
        "num_samples": 41, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.335
      }, 
      "Skin - Sun Exposed (Lower leg)": {
        "high_whisker": 0.661, 
        "low_whisker": 0.0, 
        "median": 0.128, 
        "num_samples": 126, 
        "outliers": [
          0.689, 
          1.077, 
          0.783, 
          0.88, 
          0.799, 
          0.71, 
          0.837
        ], 
        "q1": 0.0, 
        "q3": 0.274
      }, 
      "Small Intestine - Terminal Ileum": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 17, 
        "outliers": [
          0.093
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Spleen": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 34, 
        "outliers": [
          0.097
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Stomach": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 80, 
        "outliers": [
          0.08, 
          0.277, 
          0.298, 
          0.114, 
          0.236, 
          0.111, 
          0.228, 
          0.137, 
          0.117
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Testis": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 60, 
        "outliers": [
          0.069, 
          0.06, 
          0.107, 
          0.1, 
          0.136
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Thyroid": {
        "high_whisker": 0.211, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 120, 
        "outliers": [
          0.38, 
          0.327, 
          0.32, 
          0.805, 
          0.241, 
          0.353, 
          0.25, 
          0.263
        ], 
        "q1": 0.0, 
        "q3": 0.09
      }, 
      "Uterus": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 36, 
        "outliers": [
          0.063, 
          0.071, 
          0.081, 
          0.104, 
          0.561, 
          0.134, 
          0.125, 
          0.124, 
          0.107
        ], 
        "q1": 0.0, 
        "q3": 0.016
      }, 
      "Vagina": {
        "high_whisker": 0.261, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 34, 
        "outliers": [
          0.799, 
          0.579, 
          0.455
        ], 
        "q1": 0.0, 
        "q3": 0.123
      }, 
      "Whole Blood": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 190, 
        "outliers": [
          0.124, 
          0.167
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }
    }, 
    "ENST00000485503": {
      "Adipose - Subcutaneous": {
        "high_whisker": 5.22, 
        "low_whisker": 0.0, 
        "median": 1.665, 
        "num_samples": 128, 
        "outliers": [
          5.779, 
          5.943, 
          6.422, 
          5.668, 
          7.755, 
          5.525
        ], 
        "q1": 0.93, 
        "q3": 2.657
      }, 
      "Adipose - Visceral (Omentum)": {
        "high_whisker": 1.529, 
        "low_whisker": 0.0, 
        "median": 0.364, 
        "num_samples": 31, 
        "outliers": [
          3.836, 
          2.152
        ], 
        "q1": 0.242, 
        "q3": 0.837
      }, 
      "Adrenal Gland": {
        "high_whisker": 0.721, 
        "low_whisker": 0.0, 
        "median": 0.245, 
        "num_samples": 52, 
        "outliers": [
          0.824, 
          0.857, 
          0.888, 
          0.801
        ], 
        "q1": 0.122, 
        "q3": 0.363
      }, 
      "Artery - Aorta": {
        "high_whisker": 2.559, 
        "low_whisker": 0.0, 
        "median": 0.657, 
        "num_samples": 82, 
        "outliers": [
          2.817
        ], 
        "q1": 0.322, 
        "q3": 1.264
      }, 
      "Artery - Coronary": {
        "high_whisker": 1.692, 
        "low_whisker": 0.0, 
        "median": 0.364, 
        "num_samples": 44, 
        "outliers": [], 
        "q1": 0.192, 
        "q3": 0.821
      }, 
      "Artery - Tibial": {
        "high_whisker": 3.701, 
        "low_whisker": 0.0, 
        "median": 1.312, 
        "num_samples": 137, 
        "outliers": [
          4.084, 
          4.416, 
          3.922
        ], 
        "q1": 0.78, 
        "q3": 1.992
      }, 
      "Bladder": {
        "high_whisker": 1.573, 
        "low_whisker": 0.106, 
        "median": 0.882, 
        "num_samples": 11, 
        "outliers": [], 
        "q1": 0.779, 
        "q3": 1.332
      }, 
      "Brain - Amygdala": {
        "high_whisker": 0.175, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 26, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.075
      }, 
      "Brain - Anterior cingulate cortex (BA24)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 22, 
        "outliers": [
          0.31, 
          0.132, 
          0.076, 
          0.214, 
          0.07
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Caudate (basal ganglia)": {
        "high_whisker": 0.267, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 36, 
        "outliers": [
          0.328, 
          0.32
        ], 
        "q1": 0.0, 
        "q3": 0.107
      }, 
      "Brain - Cerebellar Hemisphere": {
        "high_whisker": 0.096, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 29, 
        "outliers": [
          0.21, 
          0.184
        ], 
        "q1": 0.0, 
        "q3": 0.045
      }, 
      "Brain - Cerebellum": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 31, 
        "outliers": [
          0.07, 
          0.107, 
          0.062, 
          0.479, 
          0.09, 
          0.072
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Cortex": {
        "high_whisker": 0.146, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 25, 
        "outliers": [
          0.177, 
          0.239
        ], 
        "q1": 0.0, 
        "q3": 0.059
      }, 
      "Brain - Frontal Cortex (BA9)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 28, 
        "outliers": [
          0.223, 
          0.121, 
          0.088, 
          0.063, 
          0.115
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Hippocampus": {
        "high_whisker": 0.157, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 28, 
        "outliers": [
          0.204, 
          0.218
        ], 
        "q1": 0.0, 
        "q3": 0.068
      }, 
      "Brain - Hypothalamus": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 30, 
        "outliers": [
          0.059, 
          0.053, 
          0.106, 
          0.067, 
          0.114, 
          0.128, 
          0.214
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Nucleus accumbens (basal ganglia)": {
        "high_whisker": 0.3, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 32, 
        "outliers": [
          0.358
        ], 
        "q1": 0.0, 
        "q3": 0.135
      }, 
      "Brain - Putamen (basal ganglia)": {
        "high_whisker": 0.184, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 24, 
        "outliers": [
          0.233, 
          0.384, 
          0.225
        ], 
        "q1": 0.0, 
        "q3": 0.082
      }, 
      "Brain - Spinal cord (cervical c-1)": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 19, 
        "outliers": [
          0.397, 
          0.066, 
          0.146, 
          0.103
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Brain - Substantia nigra": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 27, 
        "outliers": [
          0.105, 
          0.16, 
          0.21, 
          0.063, 
          0.085
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Breast - Mammary Tissue": {
        "high_whisker": 5.077, 
        "low_whisker": 0.0, 
        "median": 1.676, 
        "num_samples": 66, 
        "outliers": [
          5.889, 
          7.12, 
          7.856, 
          5.675
        ], 
        "q1": 0.901, 
        "q3": 2.594
      }, 
      "Cells - EBV-transformed lymphocytes": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 54, 
        "outliers": [
          0.081, 
          0.099, 
          0.092, 
          0.1, 
          0.217, 
          0.012, 
          0.275, 
          0.28
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }, 
      "Cells - Transformed fibroblasts": {
        "high_whisker": 1.222, 
        "low_whisker": 0.0, 
        "median": 0.353, 
        "num_samples": 155, 
        "outliers": [
          1.55, 
          1.615, 
          1.519, 
          1.596, 
          1.516, 
          1.396, 
          1.439, 
          1.619, 
          1.636
        ], 
        "q1": 0.181, 
        "q3": 0.616
      }, 
      "Cervix - Ectocervix": {
        "high_whisker": 1.914, 
        "low_whisker": 1.051, 
        "median": 1.565, 
        "num_samples": 6, 
        "outliers": [], 
        "q1": 1.429, 
        "q3": 1.684
      }, 
      "Cervix - Endocervix": {
        "high_whisker": 2.809, 
        "low_whisker": 0.788, 
        "median": 0.881, 
        "num_samples": 3, 
        "outliers": [], 
        "q1": 0.835, 
        "q3": 1.845
      }, 
      "Colon - Sigmoid": {
        "high_whisker": 1.978, 
        "low_whisker": 0.112, 
        "median": 0.556, 
        "num_samples": 13, 
        "outliers": [], 
        "q1": 0.329, 
        "q3": 1.194
      }, 
      "Colon - Transverse": {
        "high_whisker": 1.002, 
        "low_whisker": 0.0, 
        "median": 0.487, 
        "num_samples": 61, 
        "outliers": [
          1.915, 
          1.179, 
          1.384, 
          1.468, 
          1.156, 
          1.521, 
          1.374
        ], 
        "q1": 0.338, 
        "q3": 0.665
      }, 
      "Esophagus - Gastroesophageal Junction": {
        "high_whisker": 2.554, 
        "low_whisker": 0.081, 
        "median": 0.705, 
        "num_samples": 22, 
        "outliers": [
          2.617
        ], 
        "q1": 0.46, 
        "q3": 1.315
      }, 
      "Esophagus - Mucosa": {
        "high_whisker": 2.543, 
        "low_whisker": 0.0, 
        "median": 0.972, 
        "num_samples": 106, 
        "outliers": [
          3.058, 
          2.794, 
          2.912
        ], 
        "q1": 0.651, 
        "q3": 1.487
      }, 
      "Esophagus - Muscularis": {
        "high_whisker": 2.182, 
        "low_whisker": 0.09, 
        "median": 0.645, 
        "num_samples": 99, 
        "outliers": [
          2.274, 
          2.256
        ], 
        "q1": 0.351, 
        "q3": 1.106
      }, 
      "Fallopian Tube": {
        "high_whisker": 0.583, 
        "low_whisker": 0.226, 
        "median": 0.315, 
        "num_samples": 6, 
        "outliers": [], 
        "q1": 0.248, 
        "q3": 0.516
      }, 
      "Heart - Atrial Appendage": {
        "high_whisker": 0.766, 
        "low_whisker": 0.0, 
        "median": 0.21, 
        "num_samples": 38, 
        "outliers": [
          2.011
        ], 
        "q1": 0.0, 
        "q3": 0.353
      }, 
      "Heart - Left Ventricle": {
        "high_whisker": 0.49, 
        "low_whisker": 0.0, 
        "median": 0.102, 
        "num_samples": 95, 
        "outliers": [
          0.727, 
          0.955, 
          0.613, 
          0.642
        ], 
        "q1": 0.0, 
        "q3": 0.243
      }, 
      "Kidney - Cortex": {
        "high_whisker": 1.061, 
        "low_whisker": 0.0, 
        "median": 0.076, 
        "num_samples": 8, 
        "outliers": [], 
        "q1": 0.0, 
        "q3": 0.637
      }, 
      "Liver": {
        "high_whisker": 4.595, 
        "low_whisker": 0.498, 
        "median": 1.675, 
        "num_samples": 34, 
        "outliers": [
          5.8, 
          6.668
        ], 
        "q1": 0.805, 
        "q3": 2.553
      }, 
      "Lung": {
        "high_whisker": 2.452, 
        "low_whisker": 0.0, 
        "median": 0.72, 
        "num_samples": 133, 
        "outliers": [
          2.521
        ], 
        "q1": 0.406, 
        "q3": 1.228
      }, 
      "Minor Salivary Gland": {
        "high_whisker": 2.035, 
        "low_whisker": 1.259, 
        "median": 2.026, 
        "num_samples": 5, 
        "outliers": [
          3.004
        ], 
        "q1": 1.426, 
        "q3": 2.035
      }, 
      "Muscle - Skeletal": {
        "high_whisker": 1.285, 
        "low_whisker": 0.0, 
        "median": 0.368, 
        "num_samples": 157, 
        "outliers": [
          4.958, 
          2.735, 
          1.42, 
          1.547, 
          1.401, 
          1.549, 
          1.779, 
          1.99, 
          1.892
        ], 
        "q1": 0.188, 
        "q3": 0.665
      }, 
      "Nerve - Tibial": {
        "high_whisker": 5.548, 
        "low_whisker": 0.329, 
        "median": 2.241, 
        "num_samples": 114, 
        "outliers": [
          6.626, 
          6.273, 
          9.699, 
          5.767
        ], 
        "q1": 1.465, 
        "q3": 3.167
      }, 
      "Ovary": {
        "high_whisker": 1.09, 
        "low_whisker": 0.0, 
        "median": 0.474, 
        "num_samples": 35, 
        "outliers": [], 
        "q1": 0.241, 
        "q3": 0.724
      }, 
      "Pancreas": {
        "high_whisker": 1.063, 
        "low_whisker": 0.0, 
        "median": 0.43, 
        "num_samples": 62, 
        "outliers": [
          1.415, 
          1.394, 
          1.732
        ], 
        "q1": 0.289, 
        "q3": 0.701
      }, 
      "Pituitary": {
        "high_whisker": 0.256, 
        "low_whisker": 0.0, 
        "median": 0.082, 
        "num_samples": 22, 
        "outliers": [
          0.401
        ], 
        "q1": 0.0, 
        "q3": 0.131
      }, 
      "Prostate": {
        "high_whisker": 3.274, 
        "low_whisker": 0.0, 
        "median": 1.324, 
        "num_samples": 42, 
        "outliers": [
          4.787, 
          4.489
        ], 
        "q1": 0.619, 
        "q3": 1.974
      }, 
      "Skin - Not Sun Exposed (Suprapubic)": {
        "high_whisker": 10.001, 
        "low_whisker": 0.486, 
        "median": 3.566, 
        "num_samples": 41, 
        "outliers": [
          15.051
        ], 
        "q1": 2.302, 
        "q3": 6.596
      }, 
      "Skin - Sun Exposed (Lower leg)": {
        "high_whisker": 12.342, 
        "low_whisker": 0.222, 
        "median": 4.774, 
        "num_samples": 126, 
        "outliers": [
          15.718, 
          18.544, 
          16.354, 
          13.174, 
          21.48
        ], 
        "q1": 3.239, 
        "q3": 7.122
      }, 
      "Small Intestine - Terminal Ileum": {
        "high_whisker": 0.558, 
        "low_whisker": 0.089, 
        "median": 0.275, 
        "num_samples": 17, 
        "outliers": [
          1.007
        ], 
        "q1": 0.15, 
        "q3": 0.414
      }, 
      "Spleen": {
        "high_whisker": 0.302, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 34, 
        "outliers": [
          0.437
        ], 
        "q1": 0.0, 
        "q3": 0.121
      }, 
      "Stomach": {
        "high_whisker": 0.997, 
        "low_whisker": 0.0, 
        "median": 0.317, 
        "num_samples": 80, 
        "outliers": [
          1.263, 
          3.086, 
          1.117, 
          1.2, 
          1.191
        ], 
        "q1": 0.202, 
        "q3": 0.555
      }, 
      "Testis": {
        "high_whisker": 0.743, 
        "low_whisker": 0.0, 
        "median": 0.27, 
        "num_samples": 60, 
        "outliers": [
          0.866, 
          1.37, 
          0.766
        ], 
        "q1": 0.157, 
        "q3": 0.392
      }, 
      "Thyroid": {
        "high_whisker": 2.528, 
        "low_whisker": 0.0, 
        "median": 1.064, 
        "num_samples": 120, 
        "outliers": [
          2.917, 
          3.58, 
          2.744, 
          3.41
        ], 
        "q1": 0.704, 
        "q3": 1.5
      }, 
      "Uterus": {
        "high_whisker": 1.421, 
        "low_whisker": 0.0, 
        "median": 0.593, 
        "num_samples": 36, 
        "outliers": [
          3.398, 
          1.869, 
          2.046
        ], 
        "q1": 0.367, 
        "q3": 0.901
      }, 
      "Vagina": {
        "high_whisker": 5.227, 
        "low_whisker": 0.653, 
        "median": 2.442, 
        "num_samples": 34, 
        "outliers": [
          6.239
        ], 
        "q1": 1.628, 
        "q3": 3.396
      }, 
      "Whole Blood": {
        "high_whisker": 0.0, 
        "low_whisker": 0.0, 
        "median": 0.0, 
        "num_samples": 190, 
        "outliers": [
          0.179, 
          0.122, 
          0.105, 
          0.143, 
          0.065
        ], 
        "q1": 0.0, 
        "q3": 0.0
      }
    }
  }
};

    return plotviz;
}) (plotviz || {});
