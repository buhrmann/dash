import json, httplib, ssl, urllib2, subprocess
import datetime
import sys

baseurl = "https://api.nike.com/v1/me/sport/activities/"


# ------------------------------------------------------------------------
def get_access_token():
	""" Fetch access token via curl. Unfortunately urrlib and requests don't do sslv3 in this version """

	u = 'thomas.buehrmann@gmail.com'
	p = 'W))ten75'
	cmd = "curl 'https://developer.nike.com/services/login' --data-urlencode username='%s' --data-urlencode password='%s'"
	cmd = cmd % (u, p)
	str = subprocess.check_output(cmd, shell=True)
	js = json.loads(str)
	return js['access_token']


# Store globally
accessToken = get_access_token()


# ------------------------------------------------------------------------
def jsonFromUrl(url):
	req = urllib2.Request(url)
	req.add_header("appid", "fuelband")
	req.add_header("Accept", "application/json")

	try:
		handle = urllib2.urlopen(req)
	except IOError, e:
		print "Wrong token or other connectivity problems (e.g. missing gps data)!"
		print e
		return 0

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
		url = baseurl + "RUNNING?access_token=" + accessToken + "&count=" + str(count) + "&offset=" + str(offset)
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

	if jsGps:
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
	else:
		print "Skipping run " + str(runId)
		return 0

