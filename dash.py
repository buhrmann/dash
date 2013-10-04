import os
from urlparse import urlparse
from flask import Flask, render_template
from pymongo import MongoClient

# Create app
# ------------------------------------------------------------------------
app = Flask(__name__)

# Setup DB stuff
# ------------------------------------------------------------------------
MONGO_URL = os.environ.get('MONGOHQ_URL')
if MONGO_URL:
	# We're on the server, so get MongoHQ instance
	print 'xxxxx: ' + MONGO_URL + ' ' + urlparse(MONGO_URL).path[1:]
	client = MongoClient(MONGO_URL)
	db = client.get_default_database()
	#db = client[urlparse(MONGO_URL).path[1:]]
	print 'xxxxx: Established DB connection!'
else:
	# We're local, use localhost db coonection
	client = MongoClient('localhost', 27017)
	db = client['runs_db']

# Views
# ------------------------------------------------------------------------
@app.route('/')
def index():
	if db:
		cursor = db['runs_col'].find({}).sort("startTime", -1).limit(1)
		return str(cursor[0]['_id'])
	else:
    	return 'No db connection: ' + MONGO_URL + ' ' + urlparse(MONGO_URL).path[1:]

@app.route('/user/')
@app.route('/user/<username>')
def show_user(username=None):
    return render_template('page.html', name=username)

@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

# Autostart
# ------------------------------------------------------------------------
if __name__ == '__main__':
    app.run(debug=True)