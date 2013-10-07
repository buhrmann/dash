import os
from urlparse import urlparse
from flask import Flask, render_template
from pymongo import MongoClient

coll_name = "runs"	

# Connect to DB 
# ------------------------------------------------------------------------
def connect():
	MONGO_URL = os.environ.get('MONGOHQ_URL')
	print "Establishing db connection..."
	if MONGO_URL:
		# We're on the server, so get MongoHQ instance
		client = MongoClient(MONGO_URL)
		return client.get_default_database()
		#db = client[urlparse(MONGO_URL).path[1:]]
	else:
		# We're local, use localhost db coonection
		client = MongoClient('localhost', 27017)
		return client['runs_db']

# Get collection of runs
# ------------------------------------------------------------------------
def runs():
	db = connect()
	if(coll_name in db.collection_names()):
		print "Retrieving runs collection"
		return db[coll_name]
	else:
		print "Creating runs collection"
		db.create_collection(coll_name)
		return db[coll_name]

runs = runs()		

# Create app
# ------------------------------------------------------------------------
app = Flask(__name__)

# ------------------------------------------------------------------------
# Views
# ------------------------------------------------------------------------
@app.route('/')
def index():
	if not runs is None:
		cursor = db['runs_col'].find({}).sort("startTime", -1).limit(1)
		if cursor.count() > 0:
			return str(cursor[0]['_id'])
		else:
			return 'Collection is empty!'
	else:
		return 'Collection doesnt exist'

# Views
# ------------------------------------------------------------------------
@app.route('/user/')
@app.route('/user/<username>')
def show_user(username=None):
	return render_template('page.html', name=username)

# Views
# ------------------------------------------------------------------------
@app.errorhandler(404)
def page_not_found(e):
	return render_template('404.html'), 404

# Autostart
# ------------------------------------------------------------------------
if __name__ == '__main__':
	app.run(debug=True)

