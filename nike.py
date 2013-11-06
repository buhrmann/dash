import json, httplib, urllib2
import datetime
import sys

accessToken = "860a6bdb7e7bd3ed0f70a7778cdf723c"
baseurl = "https://api.nike.com/me/sport/activities/"

# ------------------------------------------------------------------------
def jsonFromUrl(url):
	req = urllib2.Request(url)
	req.add_header("appid", "fuelband")
	req.add_header("Accept", "application/json")

	try:
		handle = urllib2.urlopen(req)
	except IOError, e:
		print "Wrong token or other connectivity problems!"
		print e
		sys.exit(1)

	js = json.load(handle)
	return js

# Converts activityId strings to integers
# ------------------------------------------------------------------------
def listNikeRuns(max=2, count=2):
	print "Retrieving list of runs on nike+ server..."
	ids = []
	for i in range(0, max/count):
		offset = i*count + 1
		print "Downloading ids " + str(offset) + " to " + str(offset + count - 1)
		url = baseurl + "?access_token=" + accessToken + "&count=" + str(count) + "&offset=" + str(offset)
		js = jsonFromUrl(url)
		idBatch = [str(act['activityId']) for act in js['data']]
		#idBatch = [act['activityId'] for act in js['data']]
		ids.extend(idBatch)
		if(len(idBatch) < count):
			break
	return ids

# Assumes runId is an integer. 
# Returns a dictionary with run data that can be inserted into mongodb.
# ------------------------------------------------------------------------
def getNikeRun(runId):
	# Retrieve gps data
	print "Retrieving run " + str(runId) + " from nike server..."
	url = baseurl + str(runId) + "/gps?access_token=" + accessToken
	jsGps = jsonFromUrl(url)

	run = {}
	run["nid"] = str(runId)
	run["gps"] = jsGps["waypoints"]

	# Retrieve meta data
	url = baseurl + str(runId) + "?access_token=" + accessToken
	jsMeta = jsonFromUrl(url)

	startTimeStr = jsMeta["startTime"]
	startDateTime = datetime.datetime.strptime(startTimeStr, "%Y-%m-%dT%H:%M:%SZ")
	run["date"] = startDateTime

	return run

