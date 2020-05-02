import json
from collections import defaultdict

import numpy as np
import pandas as pd
from flask import Flask, render_template, request, abort
from flask_cors import cross_origin
from sklearn.metrics import pairwise_distances

app = Flask(__name__)


@app.route('/')
def index():
    return render_template('index.html')


class parent_node:
    def __init__(self, name, children):
        self.name = name
        self.children = children


class leaf_node:
    def __init__(self, name, value, asin, author):
        self.name = name
        self.value = value
        self.asin = asin
        if pd.isnull(author):
            self.author = ''
        else:
            self.author = author


@app.route('/api/getbooks')
@cross_origin(support_credentials=True)
def get_books():
    pop_books = ratings_df.groupby('asin').filter(lambda x: len(x) > 120)
    pop_books.drop_duplicates(subset=['asin'], inplace=True)
    pop_books = pop_books[['asin']]
    pop_books.reset_index(drop=True, inplace=True)
    res = pop_books.merge(books_df, on='asin')
    return res.to_json(orient="records")


@app.route('/api/getrec', methods=['POST'])
@cross_origin(support_credentials=True)
def book_rec():
    print(request.data)
    if not request.data:
        abort(400)
    res = get_similarity_matrix(request.data, ratings_df)
    return res


@app.route('/api/ratings/<string:isbn>', methods=['GET'])
def get_ratings(isbn):
    print(isbn)
    df = stats_df[['asin', 'overall']]
    test = df.groupby(['asin', 'overall'], as_index=False).size().to_frame('Count')
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
        for key, value in results[isbn].items():
            dic = {"name": key, "value": value}
            arr.append(dic)
        return json.dumps(arr)
    else:
        abort(400)

# Heat data for seasonal trends
@app.route('/api/heatmap/<string:isbn>', methods=['GET'])
def get_heatdata(isbn):
    df = stats_df[['asin', 'Date']]
    heat_df = df.groupby(['asin', 'Date'], as_index=False).size().to_frame('Count')
    results = defaultdict(lambda: defaultdict(dict))
    for index, value in heat_df.itertuples():
        for i, key in enumerate(index):
            if i == 0:
                nested = results[key]
            elif i == len(index) - 1:
                nested[key] = value
            else:
                nested = nested[key]

    # Aggregate book count based on review date
    if isbn in results:
        arr = []
        for key, value in results[isbn].items():
            dic = {"date": key, "count": value}
            arr.append(dic)
        return json.dumps(arr)
    else:
        abort(400)


@app.route('/api/stat/ratingperuser', methods=['GET'])
def get_ratingperuser():
    user_group = ratings_df.groupby('reviewerID')
    ratingperuser = user_group['reviewerID'].count()
    return ratingperuser.to_json()

#  Rating per book
@app.route('/api/stat/ratingperbook', methods=['GET'])
def get_ratingperbook():
    book_group = stats_df.groupby('asin')
    ratingperbook = book_group['asin'].count()
    return ratingperbook.to_json()

# Mean rating per user
@app.route('/api/stat/meanratingperuser', methods=['GET'])
def get_meanratinguser():
    user_group = ratings_df.groupby('reviewerID')
    meanratingperuser = user_group['overall'].agg(np.mean)
    return meanratingperuser.to_json()

# Mean rating per book
@app.route('/api/stat/meanratingperbook', methods=['GET'])
def get_meanratingperbook():
    book_group = stats_df.groupby('asin')
    meanratingperbook = book_group['overall'].agg(np.mean)
    return meanratingperbook.to_json()


def get_avg_rating(isbn):
    return round(avg_rating_df[isbn], 2)


def get_user_similar_books(user1, user2, users, books_df):
    common_books = ratings_df[ratings_df.reviewerID == users[user1]].merge(
        ratings_df[ratings_df.reviewerID == users[user2]],
        on="asin",
        how="right")
    return common_books.merge(books_df, on='asin')


def get_similar_user_books(user1, user2, users, books_df):
    common_books = ratings_df[ratings_df.reviewerID == users[user1]].merge(
        ratings_df[ratings_df.reviewerID == users[user2]],
        on="asin",
        how="right")
    print(common_books)
    return common_books.merge(books_df, on='asin')


def obj_dict(obj):
    return obj.__dict__


@app.route('/api/getPackedAuthor', methods=['POST'])
@cross_origin(support_credentials=True)
def packed_rec_author():
    print(request.data)
    if not request.data:
        abort(400)
    res = get_rec_circle_packing_chart_author(request.data, ratings_df)
    return res

# Author grouped recommendations
def get_rec_circle_packing_chart_author(input_data, ratings_df):
    json_data = json.loads(input_data)
    user_input = pd.DataFrame(json_data)
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
    no_of_reco_needed = 30
    reco = get_user_similar_books(i, cor_user, users, books_df)
    reco = reco[(reco['reviewerID_x'].isnull())].sort_values(by='overall_y', ascending=False).head(no_of_reco_needed)

    reco_author_filter = reco.loc[~reco['Author'].isin(user_rated_books_meta['Author'])]
    output = []
    children = []
    output.append(parent_node("author", children))
    node_children = []
    rating = 4000
    for index, row in reco_author_filter.iterrows():
        rating = get_avg_rating(row['asin'])
        node_children.append(leaf_node(row['Title'], rating, row['asin'], row['Author']))
    output[0].children.append(parent_node("Different Authors", node_children))
    node_children = []
    for index, row in user_rated_books_meta.iterrows():
        rating = get_avg_rating(row['asin'])
        node_children.append(leaf_node(row['Title'], rating, row['asin'], row['Author']))
    output[0].children.append(parent_node("Current User", node_children))
    return json.dumps(output, default=obj_dict)


@app.route('/api/getPackedRating', methods=['POST'])
@cross_origin(support_credentials=True)
def packed_rec_rating():
    print(request.data)
    if not request.data:
        abort(400)
    res = get_rec_circle_packing_chart_rating(request.data, ratings_df)
    return res


# Rating grouped recommendations
def get_rec_circle_packing_chart_rating(input_data, ratings_df):
    json_data = json.loads(input_data)
    user_input = pd.DataFrame(json_data)
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
    no_of_reco_needed = 25
    reco = get_user_similar_books(i, cor_user, users, books_df)
    output = []
    children = []
    output.append(parent_node("rating", children))
    for i, g in reco.groupby(['overall_y']):
        node_children = []
        for index, row in g.iterrows():
            node_children.append(leaf_node(row['Title'], get_avg_rating(row['asin']), row['asin'], row['Author']))
        output[0].children.append(parent_node(i, node_children))
    return json.dumps(output, default=obj_dict)

# Similarity score for all reviewers
def get_similarity_matrix(input_data, ratings_df):
    json_data = json.loads(input_data)
    user_input = pd.DataFrame(json_data)
    ratings_df = ratings_df.append(user_input)
    ratings_df.reset_index(drop=True, inplace=True)
    user_books = ratings_df.pivot(index="reviewerID", columns="asin", values="overall")
    user_books.fillna(0, inplace=True)
    users = user_books.index.values
    user_sim = 1 - pairwise_distances(user_books.values, metric="cosine")

    # Filter users with higher similarity score
    filter_curr_user = []
    filtered_users = []
    curr_user = user_sim[-1]
    for i in range(0, len(curr_user) - 1):
        if curr_user[i] >= 0.08:
            filter_curr_user.append(curr_user[i])
            filtered_users.append(users[i])

    x = np.array(np.array_split(filter_curr_user, 20))
    y = np.array(np.array_split(filtered_users, 20))
    result = []
    temp_sim_rating = []
    temp_users = []
    for i in x:
        temp_sim_rating.append(i.tolist())
    for i in y:
        temp_users.append(i.tolist())

    # Get similarity score of all users
    for i in range(0, len(temp_sim_rating) - 1):
        for j in range(0, len(temp_sim_rating[i]) - 1):
            temp = {'x': i, 'y': j, 'value': round(temp_sim_rating[i][j], 2), 'user': temp_users[i][j]}
            result.append(temp)

    jsonObj = {
        'user_similarity': result,
        'users': filtered_users,
    }

    return jsonObj


if __name__ == '__main__':

    # Rating dataframe :  asin , reviwerID and rating
    ratings_df = pd.read_csv("./ratings_data.csv", index_col=False)


    # book metadata dataframe : rowid, asin , meta : [ISBN, title, author, publisher, year, language]
    books_df = pd.read_csv("./final_books.csv", index_col=False)
    books_df = books_df[['asin', 'Title', 'Author']]
    stats_df = pd.read_csv("./book_stats.csv", index_col=False)

    # Average rating of a particular book
    # asin , average rating
    book_group = stats_df.groupby('asin')
    avg_rating_df = book_group['overall'].agg(np.mean)
    import os

    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
