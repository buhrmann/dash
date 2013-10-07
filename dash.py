import os
from urlparse import urlparse
from flask import Flask, render_template
from pymongo import MongoClient

import nike

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



# ------------------------------------------------------------------------
def ids():
	cursor = runs.find({}, {'id' : 1})
	return [id['_id'] for id in cursor]

# ------------------------------------------------------------------------
def insert(nid):
	newrun = nike.getNikeRun(nid)
	runs.insert(newrun)

# Runs on Nike+ that are not in the local database
# ------------------------------------------------------------------------
def diffids():
	localRuns = Set(ids())
	nikeRuns = Set(nike.listNikeRuns(200,10))
	return (nikeRuns - localRuns)

# ------------------------------------------------------------------------
def sync():
	missing_runs = diffids()
	n = len(missing_runs)
	i = 0
	for run in missing_runs:
		i += 1
		print "Inserting run " + str(i) + " of " + str(n)
		insert(run)		


# Create app
# ------------------------------------------------------------------------
app = Flask(__name__)

# ------------------------------------------------------------------------
# Views
# ------------------------------------------------------------------------
@app.route('/')
def index():
	if not runs is None:
		print ids()
		print diffids()
		sync()
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

