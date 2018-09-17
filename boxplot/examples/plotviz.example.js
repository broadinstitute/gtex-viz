var plotvizExample = (function (plotvizExample) {

    var badT = {
        "mRNASeq_Quartiles": [
            {
                "cohort": "ACC",
                "high_bound": 11.2836771,
                "low_bound": 9.0197401,
                "median": 10.24556923,
                "n": 79,
                "outliers": [
                    8.359583854675293
                ],
                "q1": 9.87819672,
                "q3": 10.53677607
            },
            {
                "cohort": "BLCA",
                "high_bound": 11.59181499,
                "low_bound": 8.75329685,
                "median": 10.14181042,
                "n": 408,
                "outliers": [
                    11.796157836914062,
                    11.62585163116455,
                    12.033931732177734,
                    11.750258445739746,
                    11.691672325134277,
                    12.812153816223145,
                    12.316694259643555,
                    11.800211906433105,
                    8.515395164489746
                ],
                "q1": 9.78178835,
                "q3": 10.50649214
            },
            {
                "cohort": "BRCA",
                "high_bound": 11.33581448,
                "low_bound": 7.72324133,
                "median": 9.49093151,
                "n": 1100,
                "outliers": [
                    12.1896390914917,
                    11.822060585021973,
                    11.594401359558105,
                    11.469980239868164,
                    11.631139755249023,
                    11.406970977783203,
                    11.533827781677246,
                    12.08948040008545,
                    11.407252311706543,
                    11.906049728393555,
                    11.640151023864746,
                    7.524142742156982,
                    7.174822807312012,
                    11.502962112426758,
                    11.410619735717773,
                    11.559789657592773,
                    11.861968040466309,
                    11.458417892456055,
                    11.715566635131836,
                    11.873283386230469,
                    12.038110733032227,
                    7.471650123596191,
                    12.297097206115723,
                    11.561759948730469,
                    11.570456504821777
                ],
                "q1": 9.02503562,
                "q3": 9.96897531
            },
            {
                "cohort": "CESC",
                "high_bound": 11.31224346,
                "low_bound": 8.40715218,
                "median": 9.84123039,
                "n": 306,
                "outliers": [
                    11.407163619995117,
                    11.694863319396973,
                    12.226938247680664,
                    11.74665355682373,
                    12.005956649780273,
                    12.023783683776855,
                    13.234296798706055,
                    12.032050132751465,
                    11.769503593444824
                ],
                "q1": 9.42171264,
                "q3": 10.20690989
            },
            {
                "cohort": "CHOL",
                "high_bound": 11.2403307,
                "low_bound": 8.52328587,
                "median": 10.15226507,
                "n": 36,
                "outliers": [
                    12.228621482849121
                ],
                "q1": 9.6496973,
                "q3": 10.61621547
            },
            {
                "cohort": "COAD",
                "high_bound": 10.75285339,
                "low_bound": 8.22266102,
                "median": 9.50603294,
                "n": 459,
                "outliers": [
                    7.217555522918701,
                    5.859827995300293,
                    11.050968170166016,
                    11.086369514465332,
                    10.850019454956055
                ],
                "q1": 9.16734886,
                "q3": 9.80170441
            },
            {
                "cohort": "COADREAD",
                "high_bound": 10.75285339,
                "low_bound": 8.22266102,
                "median": 9.49065256,
                "n": 626,
                "outliers": [
                    11.474601745605469,
                    7.217555522918701,
                    5.859827995300293,
                    11.050968170166016,
                    11.086369514465332,
                    7.935441970825195,
                    7.922414302825928,
                    12.074682235717773,
                    8.114150047302246,
                    10.850019454956055
                ],
                "q1": 9.14679766,
                "q3": 9.80987096
            },
            {
                "cohort": "DLBC",
                "high_bound": 11.42898178,
                "low_bound": 9.28108406,
                "median": 10.65916824,
                "n": 28,
                "outliers": [],
                "q1": 9.71348882,
                "q3": 10.8859241
            },
            {
                "cohort": "GBM",
                "high_bound": 11.58756447,
                "low_bound": 9.39281464,
                "median": 10.36623192,
                "n": 166,
                "outliers": [
                    11.660804748535156,
                    11.685176849365234,
                    9.0570068359375,
                    11.657876968383789,
                    12.166048049926758,
                    11.63772201538086
                ],
                "q1": 10.10845947,
                "q3": 10.70130849
            },
            {
                "cohort": "GBMLGG",
                "high_bound": 11.53764343,
                "low_bound": 9.0029974,
                "median": 10.25557995,
                "n": 696,
                "outliers": [
                    12.12321662902832,
                    8.854490280151367,
                    11.748058319091797,
                    11.945343017578125,
                    11.715670585632324,
                    12.026534080505371,
                    12.23214054107666,
                    11.627266883850098,
                    11.946501731872559,
                    11.823588371276855,
                    11.65320110321045,
                    12.399332046508789,
                    8.640925407409668,
                    13.013128280639648,
                    8.547293663024902,
                    8.901570320129395,
                    11.655491828918457,
                    11.615487098693848,
                    11.660804748535156,
                    11.685176849365234,
                    11.657876968383789,
                    12.166048049926758,
                    11.587564468383789,
                    11.63772201538086
                ],
                "q1": 9.94228125,
                "q3": 10.59680533
            },
            {
                "cohort": "HNSC",
                "high_bound": 11.58554745,
                "low_bound": 8.20334148,
                "median": 9.84470987,
                "n": 522,
                "outliers": [
                    11.65900707244873,
                    12.221030235290527,
                    11.775886535644531,
                    12.055419921875,
                    12.83536434173584,
                    12.075167655944824,
                    11.747549057006836,
                    11.950736999511719,
                    11.72619915008545,
                    12.38931941986084,
                    11.632285118103027,
                    11.774520874023438,
                    11.752229690551758,
                    11.765762329101562,
                    12.371987342834473,
                    11.733059883117676,
                    12.141260147094727,
                    12.182504653930664
                ],
                "q1": 9.44983387,
                "q3": 10.3185668
            },
            {
                "cohort": "KICH",
                "high_bound": 11.53746414,
                "low_bound": 9.05410004,
                "median": 10.22423506,
                "n": 66,
                "outliers": [
                    11.813958168029785
                ],
                "q1": 9.9331007,
                "q3": 10.59883094
            },
            {
                "cohort": "KIPAN",
                "high_bound": 11.59385872,
                "low_bound": 8.30370712,
                "median": 9.92855453,
                "n": 891,
                "outliers": [
                    12.225947380065918,
                    11.795696258544922,
                    11.841443061828613,
                    11.643275260925293,
                    11.694851875305176,
                    11.691635131835938,
                    11.647701263427734,
                    11.728111267089844,
                    8.073526382446289,
                    11.710392951965332,
                    11.90638256072998,
                    4.041435718536377,
                    8.030115127563477,
                    7.698972225189209,
                    12.076558113098145,
                    6.746841907501221,
                    6.2547526359558105,
                    13.771800994873047,
                    11.601312637329102,
                    11.763267517089844,
                    12.271296501159668,
                    12.003758430480957,
                    11.813958168029785
                ],
                "q1": 9.52796555,
                "q3": 10.35576296
            },
            {
                "cohort": "KIRC",
                "high_bound": 11.24860001,
                "low_bound": 8.52848721,
                "median": 9.71504545,
                "n": 534,
                "outliers": [
                    11.52931022644043,
                    11.90638256072998,
                    11.433846473693848,
                    4.041435718536377,
                    8.030115127563477,
                    7.698972225189209,
                    11.395007133483887,
                    12.076558113098145,
                    11.453071594238281,
                    6.746841907501221,
                    6.2547526359558105,
                    13.771800994873047,
                    11.601312637329102,
                    11.495274543762207,
                    11.763267517089844,
                    12.271296501159668,
                    12.003758430480957,
                    11.462812423706055
                ],
                "q1": 9.38285875,
                "q3": 10.14633608
            },
            {
                "cohort": "KIRP",
                "high_bound": 11.71039295,
                "low_bound": 8.73195267,
                "median": 10.15368938,
                "n": 291,
                "outliers": [
                    12.225947380065918,
                    11.795696258544922,
                    11.841443061828613,
                    8.303707122802734,
                    11.728111267089844,
                    8.073526382446289
                ],
                "q1": 9.82458544,
                "q3": 10.58218145
            },
            {
                "cohort": "LAML",
                "high_bound": 8.69783878,
                "low_bound": 5.99952221,
                "median": 7.40493107,
                "n": 173,
                "outliers": [
                    9.654520034790039,
                    9.054773330688477,
                    5.685435771942139,
                    9.009478569030762,
                    5.94159460067749,
                    5.452727317810059,
                    9.889392852783203,
                    8.764433860778809,
                    5.925097465515137
                ],
                "q1": 7.007792,
                "q3": 7.70913363
            },
            {
                "cohort": "LGG",
                "high_bound": 11.53764343,
                "low_bound": 9.0029974,
                "median": 10.21466112,
                "n": 530,
                "outliers": [
                    12.12321662902832,
                    8.854490280151367,
                    11.748058319091797,
                    11.945343017578125,
                    11.715670585632324,
                    12.026534080505371,
                    12.23214054107666,
                    11.627266883850098,
                    11.946501731872559,
                    11.823588371276855,
                    11.65320110321045,
                    12.399332046508789,
                    8.640925407409668,
                    13.013128280639648,
                    8.547293663024902,
                    8.901570320129395,
                    11.655491828918457,
                    11.615487098693848
                ],
                "q1": 9.90001297,
                "q3": 10.56138873
            },
            {
                "cohort": "LIHC",
                "high_bound": 11.84293079,
                "low_bound": 8.606534,
                "median": 10.16186714,
                "n": 373,
                "outliers": [
                    12.03318977355957,
                    11.9884614944458,
                    12.010921478271484,
                    12.248675346374512,
                    12.375782012939453,
                    11.873405456542969,
                    8.109976768493652,
                    8.20570182800293
                ],
                "q1": 9.73504543,
                "q3": 10.58332348
            },
            {
                "cohort": "LUAD",
                "high_bound": 11.35058403,
                "low_bound": 8.31638813,
                "median": 9.85294628,
                "n": 517,
                "outliers": [
                    11.596675872802734,
                    11.467509269714355,
                    8.141295433044434,
                    6.192712783813477,
                    7.359488010406494,
                    8.223089218139648,
                    7.280419826507568,
                    7.369210720062256,
                    11.50372314453125
                ],
                "q1": 9.47855663,
                "q3": 10.25723076
            },
            {
                "cohort": "LUSC",
                "high_bound": 11.10602951,
                "low_bound": 8.54523087,
                "median": 9.8106184,
                "n": 501,
                "outliers": [
                    7.8938212394714355,
                    8.278190612792969,
                    11.2715482711792,
                    11.305450439453125,
                    11.170056343078613,
                    11.751708984375,
                    11.227898597717285,
                    8.51810073852539,
                    11.138672828674316,
                    11.183365821838379,
                    8.334829330444336,
                    8.23985767364502,
                    11.150697708129883,
                    7.535244941711426
                ],
                "q1": 9.50358963,
                "q3": 10.14460182
            },
            {
                "cohort": "MESO",
                "high_bound": 12.0588007,
                "low_bound": 9.17953014,
                "median": 10.59421539,
                "n": 86,
                "outliers": [
                    12.437747955322266
                ],
                "q1": 10.25290608,
                "q3": 11.00025487
            },
            {
                "cohort": "OV",
                "high_bound": 11.52019882,
                "low_bound": 8.83091831,
                "median": 10.12428856,
                "n": 265,
                "outliers": [
                    8.59610652923584,
                    11.768579483032227,
                    12.004785537719727
                ],
                "q1": 9.78170586,
                "q3": 10.51572418
            },
            {
                "cohort": "PAAD",
                "high_bound": 11.32392979,
                "low_bound": 8.57229233,
                "median": 9.94637108,
                "n": 179,
                "outliers": [
                    11.623746871948242,
                    7.983692169189453,
                    8.13608455657959,
                    8.382973670959473,
                    8.1904935836792,
                    8.129904747009277,
                    8.2738037109375,
                    8.294584274291992,
                    8.230666160583496,
                    11.531411170959473
                ],
                "q1": 9.53675461,
                "q3": 10.26361084
            },
            {
                "cohort": "PCPG",
                "high_bound": 11.74137211,
                "low_bound": 9.07711124,
                "median": 10.3107543,
                "n": 184,
                "outliers": [
                    12.429752349853516,
                    12.24077033996582
                ],
                "q1": 9.98704743,
                "q3": 10.70108652
            },
            {
                "cohort": "PRAD",
                "high_bound": 11.74320698,
                "low_bound": 9.1410141,
                "median": 10.40398312,
                "n": 498,
                "outliers": [
                    12.621647834777832,
                    11.996262550354004,
                    12.248985290527344,
                    12.011277198791504,
                    11.846213340759277,
                    12.450826644897461,
                    12.108633995056152,
                    11.940043449401855,
                    11.89531421661377,
                    12.41812801361084,
                    11.964831352233887,
                    11.833847999572754,
                    12.107617378234863,
                    11.802324295043945,
                    11.82857608795166,
                    11.849482536315918,
                    12.143558502197266,
                    12.118715286254883,
                    11.797119140625,
                    12.060009956359863,
                    12.26081371307373,
                    8.712188720703125,
                    8.998141288757324,
                    8.826726913452148,
                    9.070356369018555,
                    8.928436279296875,
                    9.081052780151367
                ],
                "q1": 10.11610961,
                "q3": 10.7807281
            },
            {
                "cohort": "READ",
                "high_bound": 10.70613098,
                "low_bound": 7.9224143,
                "median": 9.42318344,
                "n": 167,
                "outliers": [
                    11.474601745605469,
                    12.074682235717773
                ],
                "q1": 9.06607437,
                "q3": 9.84447289
            },
            {
                "cohort": "SARC",
                "high_bound": 12.01022816,
                "low_bound": 8.98815346,
                "median": 10.32028675,
                "n": 262,
                "outliers": [
                    12.535390853881836,
                    13.191493034362793,
                    12.330280303955078,
                    12.439350128173828,
                    12.787074089050293
                ],
                "q1": 9.91096878,
                "q3": 10.8182826
            },
            {
                "cohort": "SKCM",
                "high_bound": 11.30951881,
                "low_bound": 7.74806213,
                "median": 9.56759262,
                "n": 471,
                "outliers": [
                    7.34537935256958,
                    11.412945747375488,
                    6.3979878425598145,
                    6.955312728881836,
                    6.609548091888428,
                    6.973905086517334,
                    11.385652542114258,
                    11.534701347351074,
                    11.658305168151855
                ],
                "q1": 9.07531738,
                "q3": 9.99798489
            },
            {
                "cohort": "TGCT",
                "high_bound": 10.56159306,
                "low_bound": 6.83840466,
                "median": 8.63259554,
                "n": 156,
                "outliers": [
                    10.950541496276855
                ],
                "q1": 8.11691594,
                "q3": 9.2187171
            },
            {
                "cohort": "THCA",
                "high_bound": 11.44717216,
                "low_bound": 8.71183968,
                "median": 10.09186459,
                "n": 509,
                "outliers": [
                    12.422765731811523,
                    12.388803482055664,
                    11.53480339050293,
                    11.701054573059082,
                    11.516739845275879,
                    12.256058692932129,
                    12.549583435058594,
                    11.557546615600586,
                    12.18887710571289,
                    11.788538932800293,
                    11.879430770874023,
                    11.86976432800293,
                    11.545546531677246,
                    11.811826705932617,
                    11.83402156829834
                ],
                "q1": 9.74588299,
                "q3": 10.44638729
            },
            {
                "cohort": "THYM",
                "high_bound": 12.06523991,
                "low_bound": 8.83495617,
                "median": 10.16331768,
                "n": 120,
                "outliers": [
                    12.298680305480957,
                    13.117071151733398,
                    13.253110885620117
                ],
                "q1": 9.66617942,
                "q3": 10.67784643
            },
            {
                "cohort": "UCEC",
                "high_bound": 11.75259209,
                "low_bound": 8.89833641,
                "median": 10.31567049,
                "n": 546,
                "outliers": [
                    8.361526489257812,
                    8.780259132385254,
                    8.735907554626465,
                    12.015213012695312,
                    8.473727226257324,
                    12.337996482849121,
                    12.348917007446289,
                    12.106523513793945,
                    12.306658744812012,
                    11.94315242767334,
                    13.10344409942627,
                    11.876001358032227,
                    11.974539756774902,
                    12.293179512023926,
                    8.421302795410156
                ],
                "q1": 9.94238901,
                "q3": 10.70327234
            },
            {
                "cohort": "UCS",
                "high_bound": 11.77386379,
                "low_bound": 8.85899639,
                "median": 10.41206932,
                "n": 57,
                "outliers": [],
                "q1": 9.9598217,
                "q3": 10.8170948
            },
            {
                "cohort": "UVM",
                "high_bound": 11.78498936,
                "low_bound": 9.38670635,
                "median": 10.55334902,
                "n": 80,
                "outliers": [],
                "q1": 10.07324219,
                "q3": 11.01029944
            }
        ]
    }


    var badN = {
        "mRNASeq_Quartiles": [
            {
                "cohort": "BLCA",
                "high_bound": 10.25082111,
                "low_bound": 9.20776653,
                "median": 9.63030338,
                "n": 19,
                "outliers": [
                    11.322291374206543,
                    10.569663047790527
                ],
                "q1": 9.52943754,
                "q3": 9.91433191
            },
            {
                "cohort": "BRCA",
                "high_bound": 10.22624493,
                "low_bound": 7.85709906,
                "median": 9.02902603,
                "n": 112,
                "outliers": [
                    10.805949211120605,
                    7.838602542877197,
                    10.304557800292969,
                    10.810506820678711,
                    10.950639724731445
                ],
                "q1": 8.74178362,
                "q3": 9.34165883
            },
            {
                "cohort": "CESC",
                "high_bound": 10.76599598,
                "low_bound": 9.9779377,
                "median": 10.10263443,
                "n": 3,
                "outliers": [],
                "q1": 10.04028606,
                "q3": 10.4343152
            },
            {
                "cohort": "CHOL",
                "high_bound": 10.06728077,
                "low_bound": 9.79745007,
                "median": 9.99890995,
                "n": 9,
                "outliers": [
                    10.454330444335938,
                    10.449871063232422
                ],
                "q1": 9.88845253,
                "q3": 10.06728077
            },
            {
                "cohort": "COAD",
                "high_bound": 10.86214066,
                "low_bound": 9.74215889,
                "median": 10.234478,
                "n": 41,
                "outliers": [
                    11.041650772094727,
                    11.110295295715332
                ],
                "q1": 10.06628227,
                "q3": 10.39639282
            },
            {
                "cohort": "COADREAD",
                "high_bound": 10.86214066,
                "low_bound": 9.48152256,
                "median": 10.2118082,
                "n": 51,
                "outliers": [
                    11.249751091003418,
                    11.041650772094727,
                    11.110295295715332
                ],
                "q1": 10.01442242,
                "q3": 10.38764668
            },
            {
                "cohort": "HNSC",
                "high_bound": 10.55671692,
                "low_bound": 8.7928257,
                "median": 9.64120436,
                "n": 44,
                "outliers": [
                    10.876375198364258,
                    11.623700141906738
                ],
                "q1": 9.37477803,
                "q3": 9.92611885
            },
            {
                "cohort": "KICH",
                "high_bound": 10.93835926,
                "low_bound": 9.8002739,
                "median": 10.24576855,
                "n": 25,
                "outliers": [
                    9.51064395904541
                ],
                "q1": 10.10434818,
                "q3": 10.4685173
            },
            {
                "cohort": "KIPAN",
                "high_bound": 10.93835926,
                "low_bound": 8.71033478,
                "median": 9.81257725,
                "n": 129,
                "outliers": [
                    8.532770156860352,
                    8.033570289611816
                ],
                "q1": 9.51529694,
                "q3": 10.14716816
            },
            {
                "cohort": "KIRC",
                "high_bound": 10.21126366,
                "low_bound": 9.03391361,
                "median": 9.56118965,
                "n": 72,
                "outliers": [
                    8.710334777832031,
                    8.532770156860352,
                    10.308064460754395,
                    8.033570289611816
                ],
                "q1": 9.39196062,
                "q3": 9.75739241
            },
            {
                "cohort": "KIRP",
                "high_bound": 10.65574074,
                "low_bound": 9.59382915,
                "median": 10.07176256,
                "n": 32,
                "outliers": [
                    9.40176773071289
                ],
                "q1": 9.97310543,
                "q3": 10.26181507
            },
            {
                "cohort": "LIHC",
                "high_bound": 10.9733305,
                "low_bound": 9.31672955,
                "median": 10.04491234,
                "n": 50,
                "outliers": [
                    11.189647674560547,
                    11.261667251586914
                ],
                "q1": 9.80011058,
                "q3": 10.27444792
            },
            {
                "cohort": "LUAD",
                "high_bound": 10.67867279,
                "low_bound": 9.18247318,
                "median": 9.85481739,
                "n": 59,
                "outliers": [
                    10.84996223449707,
                    10.841035842895508,
                    10.887724876403809
                ],
                "q1": 9.61171246,
                "q3": 10.08807468
            },
            {
                "cohort": "LUSC",
                "high_bound": 10.39365292,
                "low_bound": 8.87870598,
                "median": 9.77457619,
                "n": 51,
                "outliers": [
                    10.90942668914795
                ],
                "q1": 9.48726273,
                "q3": 9.95435381
            },
            {
                "cohort": "PAAD",
                "high_bound": 10.05795193,
                "low_bound": 8.66919327,
                "median": 9.77898073,
                "n": 4,
                "outliers": [],
                "q1": 9.32449555,
                "q3": 10.02576184
            },
            {
                "cohort": "PCPG",
                "high_bound": 10.56870461,
                "low_bound": 9.79830933,
                "median": 10.39396286,
                "n": 3,
                "outliers": [],
                "q1": 10.09613609,
                "q3": 10.48133373
            },
            {
                "cohort": "PRAD",
                "high_bound": 11.03055477,
                "low_bound": 9.31713676,
                "median": 10.23428249,
                "n": 52,
                "outliers": [],
                "q1": 9.93071914,
                "q3": 10.45753169
            },
            {
                "cohort": "READ",
                "high_bound": 10.45440197,
                "low_bound": 9.48152256,
                "median": 10.0365634,
                "n": 10,
                "outliers": [
                    11.249751091003418
                ],
                "q1": 9.80622816,
                "q3": 10.35957551
            },
            {
                "cohort": "SARC",
                "high_bound": 11.1669035,
                "low_bound": 10.22353649,
                "median": 10.69521999,
                "n": 2,
                "outliers": [],
                "q1": 10.45937824,
                "q3": 10.93106174
            },
            {
                "cohort": "SKCM",
                "high_bound": 9.17541218,
                "low_bound": 9.17541218,
                "median": 9.17541218,
                "n": 1,
                "outliers": [],
                "q1": 9.17541218,
                "q3": 9.17541218
            },
            {
                "cohort": "THCA",
                "high_bound": 11.05112934,
                "low_bound": 9.33725262,
                "median": 10.15435791,
                "n": 59,
                "outliers": [
                    11.281003952026367,
                    8.907770156860352,
                    11.156373023986816,
                    11.988033294677734,
                    11.770711898803711
                ],
                "q1": 9.92140436,
                "q3": 10.39600563
            },
            {
                "cohort": "THYM",
                "high_bound": 9.90446091,
                "low_bound": 9.83399773,
                "median": 9.86922932,
                "n": 2,
                "outliers": [],
                "q1": 9.85161352,
                "q3": 9.88684511
            },
            {
                "cohort": "UCEC",
                "high_bound": 11.00727081,
                "low_bound": 9.31542397,
                "median": 10.20996857,
                "n": 35,
                "outliers": [],
                "q1": 9.90787649,
                "q3": 10.3738656
            }
        ]
    }

    var badHash = {};

    badT.mRNASeq_Quartiles.forEach(function (tumor) {
        badHash[tumor.cohort] = badHash[tumor.cohort] || {};
        badHash[tumor.cohort].cohort = tumor.cohort;
        badHash[tumor.cohort].tumor = badHash[tumor.cohort].tumor || {};
        badHash[tumor.cohort].tumor.key = 'tumor';
        badHash[tumor.cohort].tumor.high_whisker = tumor.high_bound;
        badHash[tumor.cohort].tumor.low_whisker = tumor.low_bound;
        badHash[tumor.cohort].tumor.q3 = tumor.q3;
        badHash[tumor.cohort].tumor.q1 = tumor.q1;
        badHash[tumor.cohort].tumor.median = tumor.median;
        badHash[tumor.cohort].tumor.outliers = tumor.outliers;
        badHash[tumor.cohort].tumor.n = tumor.n;
        badHash[tumor.cohort].normal = {};
    });

    badN.mRNASeq_Quartiles.forEach(function (normal) {
        if (normal.cohort in badHash) {
            badHash[normal.cohort].normal.key = 'normal';
            badHash[normal.cohort].normal.high_whisker = normal.high_bound;
            badHash[normal.cohort].normal.low_whisker = normal.low_bound;
            badHash[normal.cohort].normal.q3 = normal.q3;
            badHash[normal.cohort].normal.q1 = normal.q1;
            badHash[normal.cohort].normal.median = normal.median;
            badHash[normal.cohort].normal.outliers = normal.outliers;
            badHash[normal.cohort].normal.n = normal.n;
        }
    });

    geneData = [];

    for (var cohort in badHash) {
        var datum = badHash[cohort];
        var tumor = {
            key: 'tumor',
            value: {
                high_whisker: datum.tumor.high_whisker,
                q3: datum.tumor.q3,
                median: datum.tumor.median,
                q1: datum.tumor.q1,
                low_whisker: datum.tumor.low_whisker,
                outliers: datum.tumor.outliers.map(function (d, i) {
                    return {
                        key: i,
                        value: {
                            outlier: d
                        }
                    };
                }),
                color: 'red',
                extra: {
                    n: datum.tumor.n
                }
            }
        };

        var normal = datum.normal.key ? {
            key: 'normal',
            value: {
                high_whisker: datum.normal.high_whisker,
                q3: datum.normal.q3,
                median: datum.normal.median,
                q1: datum.normal.q1,
                low_whisker: datum.normal.low_whisker,
                outliers: datum.normal.outliers.map(function (d, i) {
                    return {
                        key: i,
                        value: {
                            outlier: d
                        }
                    };
                }),
                color: 'blue',
                extra: {
                    n: datum.normal.n
                }
            }
        } : {value:{extra:{}}};

        var tumorTooltip = generateTooltipText(cohort, tumor, [tumor, normal]);
        var normalTooltip = generateTooltipText(cohort, normal, [tumor, normal]);

        tumor.value.extra.toolTip = tumorTooltip;

        normal.value = normal.value || {};
        normal.value.extra = normal.value.extra || {};
        normal.value.extra.toolTip = normalTooltip;

        geneData.push({
            key: cohort,
            value: [
                tumor,
                normal
            ]
        });
    }

    var bad = {
        badT: badT.mRNASeq_Quartiles,
        badN: badN.mRNASeq_Quartiles
    };


    function generateTooltipText (tissue, dataSet, tumorNormalPair) {
        var returnValue;

        if (typeof dataSet !== 'undefined') {
            var numberOfRecords = dataSet.value.extra.n;
            var groupName = tissue;
            if (typeof groupName !== 'undefined') {
                if (dataSet.key === 'normal') {
                    returnValue = tissue +' Normal';
                } else if (dataSet.key === 'tumor') {
                    returnValue = tissue +' Tumor';
                } else {
                    returnValue = tissue +' Error';
                }
            }
            if ((typeof dataSet !== 'undefined') &&
                (typeof dataSet.value !== 'undefined') &&
                (typeof dataSet.value.q1 !== 'undefined') &&
                (typeof dataSet.value.median !== 'undefined') &&
                (typeof dataSet.value.q3 !== 'undefined')) {
                returnValue += (" Samples: " + numberOfRecords + "<br/><p>" +
                    "first quartile: " + dataSet.value.q1.toPrecision(3) + "<br/>" +
                    "median: " + dataSet.value.median.toPrecision(3) + "<br/>" +
                    "third quartile: " + dataSet.value.q3.toPrecision(3) + "</p>");
            }
            if ((typeof tumorNormalPair !== 'undefined') &&
                (tumorNormalPair.length === 2) &&
                (typeof tumorNormalPair[0].value.median !== 'undefined') &&
                (typeof tumorNormalPair[1].value.median !== 'undefined')){
                var proportion = (tumorNormalPair[0].value.median-tumorNormalPair[1].value.median);
                var foldChange = Math.pow(2,proportion);
                returnValue += ("Fold Change: " + foldChange.toPrecision(3) );
            }else{
                returnValue += ("Fold change NA: no normal samples available" );
            }
        }
        return returnValue;
    }

    function fbSortOuterAlphabetical (a, b) {
        return a.key < b.key ? -1 : 1;
    }

    function fbSortOuterIncreasing (a, b) {
        return a.value.filter(function (d) {return 'tumor' === d.key;})[0].value.median - b.value.filter(function (d) {return 'tumor' === d.key;})[0].value.median;
    }

    function fbSortOuterDecreasing (a, b) {
        return b.value.filter(function (d) {return 'tumor' === d.key;})[0].value.median - a.value.filter(function (d) {return 'tumor' === d.key;})[0].value.median;
    }

    function fbSortInner (a, b) {
        if (a.key && !b.key) { return -1; }
        if (b.key && !a.key) { return 1; }
        if (a.key && b.key) { return 'tumor' === a.key ? -1 : 1; }
        return 0;
    }

    function removeNormals (data) {
        var newData = JSON.parse(JSON.stringify(data));
        newData.data = data.data.map(function (boxGroup) {
            return {
                key: boxGroup.key,
                value: boxGroup.value.map(function (box) {
                    return box.key ? ('tumor' === box.key ? box : {}) : {};
                })
            };
        });
        return newData;
    }

    var normalsControl = {
        key: 'normals',
        value: {
            id: 'normals-buttons',
            text: 'Normals',
            buttons: [
                {
                    key: 'button1',
                    value: {
                        text: 'On',
                        class: 'button btn-left',
                        pre: function (plot, data, config) {
                            plot.option('normals', 'on');
                        },
                        post: function (plot, data, config) {
                            var newData = JSON.parse(JSON.stringify(data));
                            if ('off' === plot.option('normals')) {
                                newData = removeNormals(newData);
                            }
                            if ('alphabetical' === plot.option('sorting')) {
                                newData.data.sort(fbSortOuterAlphabetical);
                            }
                            if ('increasing' === plot.option('sorting')) {
                                newData.data.sort(fbSortOuterIncreasing);
                            }
                            if ('decreasing' === plot.option('sorting')) {
                                newData.data.sort(fbSortOuterDecreasing);
                            }
                            newData.data.forEach(function(boxGroup) {
                                if (boxGroup.value) {
                                    boxGroup.value.sort(fbSortInner);
                                }
                            });
                            plot.render(newData, config);
                        },
                        active: true
                    }
                },
                {
                    key: 'button2',
                    value: {
                        text: 'Off',
                        class: 'button btn-right',
                        pre: function (plot, data, config) {
                            var newConfig = JSON.parse(JSON.stringify(plot.config()));
                            newConfig.normals = 'off';
                            plot.config(newConfig);
                        },
                        post: function (plot, data, config) {
                            var newData = JSON.parse(JSON.stringify(data));
                            
                            if ('off' === plot.option('normals')) {
                                newData = removeNormals(newData);
                            }
                            if ('alphabetical' === plot.option('sorting')) {
                                newData.data.sort(fbSortOuterAlphabetical);
                            }
                            if ('increasing' === plot.option('sorting')) {
                                newData.data.sort(fbSortOuterIncreasing);
                            }
                            if ('decreasing' === plot.option('sorting')) {
                                newData.data.sort(fbSortOuterDecreasing);
                            }
                            newData.data.forEach(function(boxGroup) {
                                if (boxGroup.value) {
                                    boxGroup.value.sort(fbSortInner);
                                }
                            });
                            plot.render(newData, config);
                        }
                    }
                }
            ]
        }
    };

    var scaleControl = {
        key: 'scale-control',
        value: {
            id: 'scale-buttons',
            text: 'Scale:',
            buttons: [
                {
                    key: 'button2',
                    value: {
                        text: 'Linear',
                        class: 'button btn-right',
                        pre: function (plot, data, config) {
                            plot.option('scale', 'linear');
                        },
                        post: function (plot, data, config) {
                            var newData = JSON.parse(JSON.stringify(data));
                            if ('off' === plot.option('normals')) {
                                newData = removeNormals(newData);
                            }
                            if ('alphabetical' === plot.option('sorting')) {
                                newData.data.sort(fbSortOuterAlphabetical);
                            }
                            if ('increasing' === plot.option('sorting')) {
                                newData.data.sort(fbSortOuterIncreasing);
                            }
                            if ('decreasing' === plot.option('sorting')) {
                                newData.data.sort(fbSortOuterDecreasing);
                            }
                            newData.data.forEach(function(boxGroup) {
                                if (boxGroup.value) {
                                    boxGroup.value.sort(fbSortInner);
                                }
                            });
                            plot.render(newData, config);
                        },
                        active: true
                    }
                },
                {
                    key: 'button1',
                    value: {
                        text: 'Log',
                        class: 'button btn-left',
                        pre: function (plot, data, config) {
                            plot.option('scale', 'log');
                        },
                        post: function (plot, data, config) {
                            var newData = JSON.parse(JSON.stringify(data));
                            if ('off' === plot.option('normals')) {
                                newData = removeNormals(newData);
                            }
                            if ('alphabetical' === plot.option('sorting')) {
                                newData.data.sort(fbSortOuterAlphabetical);
                            }
                            if ('increasing' === plot.option('sorting')) {
                                newData.data.sort(fbSortOuterIncreasing);
                            }
                            if ('decreasing' === plot.option('sorting')) {
                                newData.data.sort(fbSortOuterDecreasing);
                            }
                            newData.data.forEach(function(boxGroup) {
                                if (boxGroup.value) {
                                    boxGroup.value.sort(fbSortInner);
                                }
                            });
                            plot.render(newData, config);
                        }
                    }
                }
            ]
        }
    };

    var outlierControl = {
        key: 'outlier-control',
        value: {
            id: 'outlier-buttons',
            text: 'Outliers:',
            buttons: [
                {
                    key: 'button1',
                    value: {
                        text: 'On',
                        class: 'button btn-left',
                        pre: function (plot, data, config) {
                            plot.option('outliers', 'on');
                        },
                        post: function (plot, data, config) {
                            var newData = JSON.parse(JSON.stringify(data));
                            if ('off' === plot.option('normals')) {
                                newData = removeNormals(newData);
                            }
                            if ('alphabetical' === plot.option('sorting')) {
                                newData.data.sort(fbSortOuterAlphabetical);
                            }
                            if ('increasing' === plot.option('sorting')) {
                                newData.data.sort(fbSortOuterIncreasing);
                            }
                            if ('decreasing' === plot.option('sorting')) {
                                newData.data.sort(fbSortOuterDecreasing);
                            }
                            newData.data.forEach(function(boxGroup) {
                                if (boxGroup.value) {
                                    boxGroup.value.sort(fbSortInner);
                                }
                            });
                            plot.render(newData, config);
                        },
                        active: true
                    }
                },
                {
                    key: 'button2',
                    value: {
                        text: 'Off',
                        class: 'button btn-right',
                        pre: function (plot, data, config) {
                            plot.option('outliers', 'off');
                        },
                        post: function (plot, data, config) {
                            var newData = JSON.parse(JSON.stringify(data));
                            if ('off' === plot.option('normals')) {
                                newData = removeNormals(newData);
                            }
                            if ('alphabetical' === plot.option('sorting')) {
                                newData.data.sort(fbSortOuterAlphabetical);
                            }
                            if ('increasing' === plot.option('sorting')) {
                                newData.data.sort(fbSortOuterIncreasing);
                            }
                            if ('decreasing' === plot.option('sorting')) {
                                newData.data.sort(fbSortOuterDecreasing);
                            }
                            newData.data.forEach(function(boxGroup) {
                                if (boxGroup.value) {
                                    boxGroup.value.sort(fbSortInner);
                                }
                            });
                            plot.render(newData, config);
                        }
                    }
                }
            ]
        }
    };

    var mediansControl = {
        key: 'medians-control',
        value: {
            id: 'medians-buttons',
            text: 'Medians:',
            buttons: [
                {
                    key: 'button1',
                    value: {
                        text: 'All',
                        class: 'button btn-left',
                        pre: function (plot, data, config) {
                            plot.option('medians', 'all');
                        },
                        post: function (plot, data, config) {
                            var newData = JSON.parse(JSON.stringify(data));
                            if ('off' === plot.option('normals')) {
                                newData = removeNormals(newData);
                            }
                            if ('alphabetical' === plot.option('sorting')) {
                                newData.data.sort(fbSortOuterAlphabetical);
                            }
                            if ('increasing' === plot.option('sorting')) {
                                newData.data.sort(fbSortOuterIncreasing);
                            }
                            if ('decreasing' === plot.option('sorting')) {
                                newData.data.sort(fbSortOuterDecreasing);
                            }
                            newData.data.forEach(function(boxGroup) {
                                if (boxGroup.value) {
                                    boxGroup.value.sort(fbSortInner);
                                }
                            });
                            plot.render(newData, config);
                        },
                        active: true
                    }
                },
                {
                    key: 'button2',
                    value: {
                        text: 'Only',
                        class: 'button btn-right',
                        pre: function (plot, data, config) {
                            plot.option('medians', 'only');
                        },
                        post: function (plot, data, config) {
                            var newData = JSON.parse(JSON.stringify(data));
                            if ('off' === plot.option('normals')) {
                                newData = removeNormals(newData);
                            }
                            if ('alphabetical' === plot.option('sorting')) {
                                newData.data.sort(fbSortOuterAlphabetical);
                            }
                            if ('increasing' === plot.option('sorting')) {
                                newData.data.sort(fbSortOuterIncreasing);
                            }
                            if ('decreasing' === plot.option('sorting')) {
                                newData.data.sort(fbSortOuterDecreasing);
                            }
                            newData.data.forEach(function(boxGroup) {
                                if (boxGroup.value) {
                                    boxGroup.value.sort(fbSortInner);
                                }
                            });
                            plot.render(newData, config);
                        }
                    }
                }
            ]
        }
    };

    var sortControl = {
        key: 'sort-control',
        value: {
            id: 'sort-buttons',
            text: 'Sort:',
            buttons: [
                {
                    key: 'button1',
                    value: {
                        text: 'ABC',
                        class: 'button btn-left',
                        pre: function (plot, data, config) {
                            plot.option('sorting', 'alphabetical');
                        },
                        post: function (plot, data, config) {
                            var newData = JSON.parse(JSON.stringify(data));
                            if ('off' === plot.option('normals')) {
                                newData = removeNormals(newData);
                            }
                            if ('alphabetical' === plot.option('sorting')) {
                                newData.data.sort(fbSortOuterAlphabetical);
                            }
                            if ('increasing' === plot.option('sorting')) {
                                newData.data.sort(fbSortOuterIncreasing);
                            }
                            if ('decreasing' === plot.option('sorting')) {
                                newData.data.sort(fbSortOuterDecreasing);
                            }
                            newData.data.forEach(function(boxGroup) {
                                if (boxGroup.value) {
                                    boxGroup.value.sort(fbSortInner);
                                }
                            });
                            plot.render(newData, config);
                        },
                        active: true
                    }
                },
                {
                    key: 'button2',
                    value: {
                        text: '\u25B2',
                        class: 'button btn-right',
                        pre: function (plot, data, config) {
                            plot.option('sorting', 'increasing');
                        },
                        post: function (plot, data, config) {
                            var newData = JSON.parse(JSON.stringify(data));
                            if ('off' === plot.option('normals')) {
                                newData = removeNormals(newData);
                            }
                            if ('alphabetical' === plot.option('sorting')) {
                                newData.data.sort(fbSortOuterAlphabetical);
                            }
                            if ('increasing' === plot.option('sorting')) {
                                newData.data.sort(fbSortOuterIncreasing);
                            }
                            if ('decreasing' === plot.option('sorting')) {
                                newData.data.sort(fbSortOuterDecreasing);
                            }
                            newData.data.forEach(function(boxGroup) {
                                if (boxGroup.value) {
                                    boxGroup.value.sort(fbSortInner);
                                }
                            });
                            plot.render(newData, config);
                        }
                    }
                },
                {
                    key: 'button3',
                    value: {
                        text: '\u25BC',
                        class: 'button btn-right',
                        pre: function (plot, data, config) {
                            plot.option('sorting', 'decreasing');
                        },
                        post: function (plot, data, config) {
                            var newData = JSON.parse(JSON.stringify(data));
                            if ('off' === plot.option('normals')) {
                                newData = removeNormals(newData);
                            }
                            if ('alphabetical' === plot.option('sorting')) {
                                newData.data.sort(fbSortOuterAlphabetical);
                            }
                            if ('increasing' === plot.option('sorting')) {
                                newData.data.sort(fbSortOuterIncreasing);
                            }
                            if ('decreasing' === plot.option('sorting')) {
                                newData.data.sort(fbSortOuterDecreasing);
                            }
                            newData.data.forEach(function(boxGroup) {
                                if (boxGroup.value) {
                                    boxGroup.value.sort(fbSortInner);
                                }
                            });
                            plot.render(newData, config);
                        }
                    }
                }
            ]
        }
    };


    var input = {
        metadata: {
            type: 'box',
            title: 'BAD Differential Plot Example 1',
            xlabel: '',
            ylabel: '<a xlink:href="https://google.com">RSEM</a>',
            controls: [sortControl,
                    scaleControl,
                    'crosshair',
                    outlierControl,
                    mediansControl,
                    normalsControl],
            width: 1400,
            height: 800,
            position: {
                legend: { left: 6/7, top: 1/8, right: 6/7 },
                viewer: { left: 1/7, top: 1/4, right: 6/7, bottom: 3/4 },
                control: { left: 1/8, top: 7/8 }
            },
            options: [
                {
                    key: 'normals-button',
                    value: {
                        key: 'normals',
                        initial: 'on'
                    }
                }
            ],
            init: function (plot, data, config) {
                var newData = JSON.parse(JSON.stringify(data));
                newData.data.sort(fbSortOuterAlphabetical);

                newData.data.forEach(function(boxGroup) {
                    if (boxGroup.value) {
                        boxGroup.value.sort(fbSortInner);
                    }
                });

                plot.render(newData, plot.config());
            }
        },
        data: geneData,
        legend: [
            {
                key: 'tumor',
                value: {
                    label: 'tumor',
                    color: 'red'
                },
            },
            {
                key: 'normal',
                value: {
                    label: 'normal',
                    color: 'blue'
                }
            },
            {
                key: 'missing',
                value: {
                    label: 'missing',
                    color: '#808080',
                    opacity: 0.1
                }
            }
        ]
    };

    plotvizExample.input = input;

    return plotvizExample;

}) ({});
