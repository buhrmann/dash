import os
from urlparse import urlparse
from flask import Flask, render_template, request, flash, url_for, session, redirect
from pymongo import MongoClient
from bson.objectid import ObjectId
from sets import Set
import json
import datetime

import nike
import stats

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
	cursor = runs.find({}, {'nid' : 1})
	return [r['nid'] for r in cursor]

# ------------------------------------------------------------------------
def insert(nid):
	newrun = nike.getNikeRun(nid)
	process(newrun)
	runs.insert(newrun)

# Runs on Nike+ that are not in the local database
# ------------------------------------------------------------------------
def diffids(max_ids=250):
	localRuns = Set(ids())
	nikeRuns = Set(nike.listNikeRuns(max_ids, 10))
	return (nikeRuns - localRuns)

# ------------------------------------------------------------------------
def sync(max_runs=100):
	missing_nids = diffids(max_runs)
	for nid in missing_nids:
		insert(nid)		

# ------------------------------------------------------------------------
def process(run, recalc=False):
	# Expand the gps data
	print "Processing run " + str(run['nid'])
	gps = run['gps']
	df = stats.gpsToDf(gps)
	stats.expandGps(df)
	run['gps'] = [row[1].to_dict() for row in df.iterrows()]
	
	# Calculate statistics
	stat = stats.stats(df)
	run['stats'] = stat

	#getRuns().update({"_id" : nid}, {"$set" : {"stats" : stats, "gps" : rows}})		

# ------------------------------------------------------------------------
def processAll(recalc=False):
	if recalc:
		cursor = runs.find()
	else:
		cursor = rund.find( {"stats" : {"$exists" : False}} )

	n = cursor.count()
	i = 1
	for run in cursor:
		print "Processing run " + str(i) + " of " + str(n)
		process(run)
		runs.save(run)		
		i += 1

# ------------------------------------------------------------------------
def statsPeriod(s, e):
	returndic = {"date":1, "stats":1}
	cursor = runs.find({"date":{"$gte":s, "$lte":e}}, returndic).sort("date",1)
	return [dict(r["stats"], **{"date":r["date"].strftime("%Y-%m-%d")}) for r in cursor]

# ------------------------------------------------------------------------
def statsAll():
	returndic = {"date":1, "stats":1}
	cursor = runs.find({}, returndic).sort("date", 1)
	return [dict(r["stats"], **{"date":r["date"].strftime("%Y-%m-%d")}) for r in cursor]

# ------------------------------------------------------------------------
def runForDate(timedate):
	s = timedate
	e = s + datetime.timedelta(days=1)
	returndic = {"_id":0, "date":1, "stats":1, "gps":1}
	run = runs.find_one({"date":{"$gte":s, "$lt":e}}, returndic)
	run['date'] = run['date'].strftime("%Y-%m-%d")
	return run

# ------------------------------------------------------------------------
def dropall():
	runs.drop()

# ------------------------------------------------------------------------
def count():
	return runs.count()


# Create app
# ------------------------------------------------------------------------
app = Flask(__name__)

# ------------------------------------------------------------------------
# Views
# ------------------------------------------------------------------------
@app.route('/')
def index():
	return render_template('page.html')

@app.route('/runs')
@app.route('/runs/')
def show_runs():
	s = statsAll()
	js = json.dumps(s)
	return render_template('runs.html', data=js)

@app.route('/runs/<date>')
def show_run(date):
	data = runForDate(datetime.datetime.strptime(date, "%Y-%m-%d"))
	js = json.dumps(data)
	return render_template('run.html', data=js)

#@app.route('/sync/<int:fetch_max>')
@app.route('/sync_ajax')
def sync_runs_ajax():
	fetch_max = request.args.get('maxruns', 0, type=int)
	c = count()
	sync(fetch_max)
	return "Had " + str(c) + " runs. Now got " + str(count())

@app.route('/sync/<int:fetch_max>')
def sync_runs(fetch_max):
	c = count()
	sync(fetch_max)
	flash("Had " + str(c) + " runs. Now got " + str(count()), "info")
	return redirect(url_for('show_runs'))

@app.route('/runs/process')
def process_runs():
	c = count()
	processAll(True)
	return "Added " + str(count() - c) + " new runs."


@app.route('/runs/drop')
def drop_runs():
	c = str(count())
	dropall()
	return "Dropped all " + c + " runs!"

@app.errorhandler(404)
def page_not_found(e):
	return render_template('404.html'), 404

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                               'favicon.ico', mimetype='image/vnd.microsoft.icon')	

app.secret_key = 'A0Zr98j/3yX R~XHH!jmN]LWX/,?RT'

# Autostart
# ------------------------------------------------------------------------
if __name__ == '__main__':
	app.run(debug=True)

