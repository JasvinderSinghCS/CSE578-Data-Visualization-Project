

from flask import Flask,render_template,request,abort
import pandas as pd
import numpy as np
from sklearn.metrics import pairwise_distances
from scipy.spatial.distance import cosine, correlation
import json
from flask_cors import CORS, cross_origin
from collections import defaultdict


app = Flask(__name__)
# app.config['SECRET_KEY'] = 'the quick brown fox jumps over the lazy   dog'
# app.config['CORS_HEADERS'] = 'Content-Type'
# CORS(app,resources={r"/api/getrec": {"origins": "http://127.0.0.1:5000"}},support_credentials=True)

@app.route('/')
def index():
	return render_template('index.html')


@app.route('/api/getbooks')
@cross_origin(support_credentials=True)
def get_books():
    pop_books = ratings_df.groupby('asin').filter(lambda x : len(x) > 120)
    pop_books.drop_duplicates(subset=['asin'],inplace=True)
    pop_books = pop_books[['asin']]
    pop_books.reset_index(drop=True,inplace=True)
    res = pop_books.merge(books_df,on='asin')
    return res.to_json(orient="records")

@app.route('/api/getrec',methods=['POST'])
@cross_origin(support_credentials=True)
def book_rec():
    print(request.data)
    if not request.data:
        abort(400)
    res = get_rec(request.data, ratings_df)
    rec_author_filtered = get_rec_author_filtered(request.data, ratings_df)
    print(res)
    print(rec_author_filtered)
    return res

@app.route('/api/getvenn',methods=['POST'])
@cross_origin(support_credentials=True)
def user_venn():
    print(request.data)
    if not request.data:
        abort(400)
    res = get_venn(request.data, ratings_df)
    return res

@app.route('/api/ratings/<string:isbn>',methods=['GET'])
def get_ratings(isbn):
    print(isbn)
    df = stats_df[['asin','overall']]
    test = df.groupby(['asin','overall'],as_index=False).size().to_frame('Count')
    results = defaultdict(lambda: defaultdict(dict))
    for index, value in test.itertuples():
        for i, key in enumerate(index):
            if i == 0:
                nested = results[key]
            elif i == len(index) - 1:
                nested[key] = value
            else:
                nested = nested[key]
    if isbn in results:
        arr = []
        for key,value in results[isbn].items():
            dic = {"name":key,"value":value}
            arr.append(dic)
        return json.dumps(arr)
    else:
        abort(400) 
    # print(results[isbn])
    # return json.dumps(results[isbn])

@app.route('/api/heatmap/<string:isbn>',methods=['GET'])
def get_heatdata(isbn):
    df = stats_df[['asin','Date']]
    heat_df = df.groupby(['asin','Date'],as_index=False).size().to_frame('Count')
    results = defaultdict(lambda: defaultdict(dict))
    for index, value in heat_df.itertuples():
        for i, key in enumerate(index):
            if i == 0:
                nested = results[key]
            elif i == len(index) - 1:
                nested[key] = value
            else:
                nested = nested[key]
    if isbn in results:
        arr = []
        for key,value in results[isbn].items():
            dic = {"date":key,"count":value}
            arr.append(dic)
        return json.dumps(arr)
    else:
        abort(400) 
    # print(results[isbn])
    # return json.dumps(results[isbn])

@app.route('/api/stat/ratingperuser',methods=['GET'])
def get_ratingperuser():
    user_group = ratings_df.groupby('reviewerID')
    ratingperuser = user_group['reviewerID'].count()
    return ratingperuser.to_json()

@app.route('/api/stat/ratingperbook',methods=['GET'])
def get_ratingperbook():
    book_group = stats_df.groupby('asin')
    ratingperbook = book_group['asin'].count()
    return ratingperbook.to_json()

@app.route('/api/stat/meanratingperuser',methods=['GET'])
def get_meanratinguser():
    user_group = ratings_df.groupby('reviewerID')
    meanratingperuser = user_group['overall'].agg(np.mean)
    return meanratingperuser.to_json()

@app.route('/api/stat/meanratingperbook',methods=['GET'])
def get_meanratingperbook():
    book_group = stats_df.groupby('asin')
    meanratingperbook = book_group['overall'].agg(np.mean)
    return meanratingperbook.to_json()

def get_user_similar_books( user1, user2,users,books_df):
  common_books = ratings_df[ratings_df.reviewerID == users[user1]].merge(
      ratings_df[ratings_df.reviewerID == users[user2]],
      on = "asin",
      how = "right")
  return common_books.merge(books_df, on = 'asin' )

def get_similar_user_books( user1, user2,users,books_df):
  common_books = ratings_df[ratings_df.reviewerID == users[user1]].merge(
      ratings_df[ratings_df.reviewerID == users[user2]],
      on = "asin",
      how = "right")
  print(common_books)
  return common_books.merge(books_df, on = 'asin' )


# def get_venn(input_data, ratings_df):
#     json_data = json.loads(input_data)
#     user_input = pd.DataFrame(json_data)
#     user_rated_books = user_input.filter(lambda x : x.overall > 0)
#     ratings_df = ratings_df.append(user_input)
#     ratings_df.reset_index(drop=True,inplace=True)
#     user_books = ratings_df.pivot(index="reviewerID",columns="asin",values="overall")
#     user_books.fillna( 0, inplace = True )
#     users = user_books.index.values
#     user_sim = 1 - pairwise_distances( user_books.values, metric="cosine" )
#     np.fill_diagonal( user_sim, 0 )
#     user_sim_df = pd.DataFrame(user_sim)
#     i =np.where(users == "REV001")[0][0]
#     cor_user = user_sim_df.idxmax(axis=1)[i]
#     no_of_reco_needed = 10
#     reco = get_user_similar_books(i,cor_user,users,books_df)
#     print(reco['Title'])
#     print(user_rated_books.merge(books_df, on='asin'))

def get_rec_author_filtered(input_data, ratings_df):
    json_data = json.loads(input_data)
    user_input = pd.DataFrame(json_data)
    # user_rated_books = user_input.filter(lambda x: x.overall > 0)
    user_rated_books = user_input[user_input.overall > 0]
    user_rated_books_meta = user_rated_books.merge(books_df, on='asin')
    ratings_df = ratings_df.append(user_input)
    ratings_df.reset_index(drop=True, inplace=True)
    user_books = ratings_df.pivot(index="reviewerID", columns="asin", values="overall")
    user_books.fillna(0, inplace=True)
    users = user_books.index.values
    user_sim = 1 - pairwise_distances(user_books.values, metric="cosine")
    np.fill_diagonal(user_sim, 0)
    user_sim_df = pd.DataFrame(user_sim)
    i = np.where(users == "REV001")[0][0]
    cor_user = user_sim_df.idxmax(axis=1)[i]
    no_of_reco_needed = 10
    reco = get_user_similar_books(i, cor_user, users, books_df)
    reco_likes = reco[(reco['reviewerID_x'].isnull()) & (reco['overall_y'] >= 4)].sort_values(by='overall_y', ascending=False).head(no_of_reco_needed)
    reco_likes = reco_likes[['asin', 'Title', 'Author']]
    reco_dislikes = reco[(reco['reviewerID_x'].isnull()) & (reco['overall_y'] > 0)].sort_values(by='overall_y',ascending=True).head(no_of_reco_needed)
    reco_dislikes = reco_dislikes[['asin', 'Title', 'Author']]
    reco = reco_likes.append(reco_dislikes)
    likes_cluster = np.ones(no_of_reco_needed, dtype=int)
    dislikes_cluster = np.full(no_of_reco_needed, 2, dtype=int)
    clusters = np.append(likes_cluster, dislikes_cluster)
    reco_clusters = reco.assign(cluster=clusters)
    reco_author_filter = reco_clusters.loc[~reco['Author'].isin(user_rated_books_meta['Author'])]
    return reco_author_filter.to_json(orient='records')



def get_rec(input_data, ratings_df):
    json_data = json.loads(input_data)
    user_input = pd.DataFrame(json_data)
    # user_rated_books = user_input.filter(lambda x: x.overall > 0)
    # user_rated_books = user_input[user_input.overall > 0]
    # user_rated_books_meta = user_rated_books.merge(books_df, on='asin')
    ratings_df = ratings_df.append(user_input)
    ratings_df.reset_index(drop=True,inplace=True)
    user_books = ratings_df.pivot(index="reviewerID",columns="asin",values="overall")
    user_books.fillna( 0, inplace = True )
    users = user_books.index.values
    user_sim = 1 - pairwise_distances( user_books.values, metric="cosine" )
    np.fill_diagonal( user_sim, 0 )
    user_sim_df = pd.DataFrame(user_sim)
    i =np.where(users == "REV001")[0][0]
    cor_user = user_sim_df.idxmax(axis=1)[i]
    no_of_reco_needed = 10
    reco = get_user_similar_books(i,cor_user,users,books_df)
    reco_likes = reco[(reco['reviewerID_x'].isnull()) & (reco['overall_y'] >=4)].sort_values(by='overall_y',ascending=False).head(no_of_reco_needed)
    reco_likes = reco_likes[['asin','Title','Author']]
    reco_dislikes = reco[(reco['reviewerID_x'].isnull()) & (reco['overall_y'] > 0)].sort_values(by='overall_y',ascending=True).head(no_of_reco_needed)
    reco_dislikes = reco_dislikes[['asin', 'Title', 'Author']]
    reco = reco_likes.append(reco_dislikes)
    likes_cluster = np.ones(no_of_reco_needed, dtype=int)
    dislikes_cluster = np.full(no_of_reco_needed, 2, dtype=int)
    clusters = np.append(likes_cluster,dislikes_cluster)
    reco_clusters = reco.assign(cluster = clusters)
    return reco_clusters.to_json(orient='records')

if __name__ == '__main__':
    ratings_df = pd.read_csv("./ratings_data.csv",index_col=False)
    books_df = pd.read_csv("./final_books.csv",index_col=False)
    books_df = books_df[['asin','Title','Author']]
    stats_df = pd.read_csv("./book_stats.csv",index_col=False)
    app.run(debug=True) 