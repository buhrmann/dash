import os
from urlparse import urlparse
from flask import Flask, render_template, request, flash, url_for, session, redirect, send_from_directory
from pymongo import MongoClient, ASCENDING, DESCENDING
from bson.objectid import ObjectId
from sets import Set
import json
import datetime

import nike
import stats as st

# Configuration
RUNS_COL = "runs"
STATS_COL = "stats"	
DEBUG = True
SECRET_KEY = os.environ['Secret_key']

# Create app
# ------------------------------------------------------------------------
app = Flask(__name__)
app.config.from_object(__name__)

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
def getOrCreateCol(name):
	db = connect()
	if(not name in db.collection_names()):
		db.create_collection(name)	
	return db[name]
	

# Globals
# ------------------------------------------------------------------------
stats = getOrCreateCol(STATS_COL)
runs = getOrCreateCol(RUNS_COL)
runs.ensure_index([('nid', ASCENDING)])
runs.ensure_index([('date', ASCENDING)])
stats.ensure_index([('date', ASCENDING)])

# ------------------------------------------------------------------------
def run(nid):
	return runs.find_one({'nid' : nid})

# ------------------------------------------------------------------------
def ids():
	cursor = runs.find({}, {'nid' : 1})
	return [r['nid'] for r in cursor]

# ------------------------------------------------------------------------
def insert(nid):
	newrun = nike.getNikeRun(nid)
	if newrun:
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
	df = st.gpsToDf(gps)
	st.expandGps(df)
	run['gps'] = [row[1].to_dict() for row in df.iterrows()]
	
	# Calculate statistics
	stat = st.stats(df)
	run['stats'] = stat

	# Add temperature etc...
	addTemp(run)
	addDateBucket(run)
	
	# Update time aggregated statistics
	updateStats(run)

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
def updateStats(run):
	queryW = {"year" : run['date_bucket']['y'],  "month" : run['date_bucket']['m'], "week" : run['date_bucket']['w']}
	queryM = {"year" : run['date_bucket']['y'],  "month" : run['date_bucket']['m']}
	queryY = {"year" : run['date_bucket']['y']}
	update = {
		"$inc" : { "distance" : run['stats']['distance'], 
				   "avgspeed" : run['stats']['avgspeed'],
				   "duration" : run['stats']['duration'],
				   "temp"	  : run['stats']['temp'],
				   "num" : 1}
	}
	stats.weekly.update(queryW, update, upsert=True)
	stats.monthly.update(queryM, update, upsert=True)
	stats.annual.update(queryY, update, upsert=True)

def updateAllStats():
	stats.weekly.drop()
	stats.monthly.drop()
	stats.annual.drop()

	cursor = runs.find().sort("date",1)
	for r in cursor:
		updateStats(r)
		print '.'

def getMonthlyStats():
	return [ s for s in stats.monthly.find({}, { "_id" : 0})]

# ------------------------------------------------------------------------
def addTemp(run):
	t = st.temperature(run['date'], "placeholder")
	if t is not None:
		run['stats']['temp'] = t

# ------------------------------------------------------------------------
def addTemps(redoall=False):
	if redoall:
		cursor = runs.find()
	else:
		cursor = runs.find( {"$or": [
			{"stats.temp" : {"$exists" : False}},
			{"stats.temp" : None}
			]} )
	n = cursor.count()
	i = 1
	for run in cursor:
		print "Retrieving temperature for run " + str(i) + " of " + str(n)
		addTemp(run)
		runs.save(run)
		i += 1	

# ------------------------------------------------------------------------
def addDateBucket(run):
	d = run['date']
	b = {"y" : d.year, "m" : d.month, "w" : d.isocalendar()[1]}
	run['date_bucket'] = b

# ------------------------------------------------------------------------
def addDateBuckets(redoall=False):
	if redoall:
		cursor = runs.find()
	else:
		cursor = runs.find( {"$or": [
			{"date_bucket" : {"$exists" : False}},
			{"date_bucket" : None}
			]} )
	n = cursor.count()
	for run in cursor:
		addDateBucket(run)
		runs.save(run)

# ------------------------------------------------------------------------
def statPerMonth(stat):
	s = runs.aggregate(
		[
			{ "$project" : { "month_run" : { "$month" : "$date"} }},
			{ "$group" : { "_id" : { "month_run" : "$month_run"}, "number" : { "$sum" : 1} }},
			{ "$sort" : { "_id.month_run" : 1}}
		]
	)
	return s

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


# ------------------------------------------------------------------------
# Views
# ------------------------------------------------------------------------
@app.route('/')
def index():
	s = statsAll()
	js = json.dumps(s)
	return render_template('overview.html', data=js)	

@app.route('/runs')
@app.route('/runs/')
def show_runs():
	s = statsAll()
	js = json.dumps(s)
	return render_template('runs.html', data=js)

@app.route('/stats')
def show_stats():
	s = statsAll()
	js = json.dumps(s)
	return render_template('stats.html', data=js)

@app.route('/progress')
def show_progress():
	s = getMonthlyStats()
	js = json.dumps(s)
	return render_template('progress.html', data=js)

@app.route('/runs/<date>')
def show_run(date):
	data = runForDate(datetime.datetime.strptime(date, "%Y-%m-%d"))
	js = json.dumps(data)
	return render_template('run.html', data=js)

@app.route('/sync', methods=['POST'])
def sync_runs():
	if not session.get('logged_in'):
		abort(401)
	#fetch_max = request.args.get('maxruns', 0, type=int)
	fetch_max = int(request.form['maxruns'])
	c = count()
	sync(fetch_max)
	flash("Added " + str(count() - c) + " new runs.")
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

@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        if request.form['username'] != os.environ['Nike_user']:
            error = 'Invalid username'
        elif request.form['password'] != os.environ['Nike_pass']:
            error = 'Invalid password'
        else:
            session['logged_in'] = True
            flash('You were logged in')
            return redirect(url_for('show_runs'))

    flash(error)
    return redirect(url_for('show_runs'))

@app.route('/logout')
def logout():
    session.pop('logged_in', None)
    flash('You were logged out')
    return redirect(url_for('show_runs'))


@app.errorhandler(404)
def page_not_found(e):
	return render_template('404.html'), 404

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                               'favicon.ico', mimetype='image/vnd.microsoft.icon')	


# Autostart
# ------------------------------------------------------------------------
if __name__ == '__main__':
	app.run()

