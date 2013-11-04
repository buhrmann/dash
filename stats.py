import pandas as pd
import numpy as np
from math import pi, sin, cos, sqrt, atan2
import datetime
import urllib2
import json

earthRad = 6371

# ------------------------------------------------------------------------
def gpsToDf(gps):
	return pd.DataFrame(gps)

# ------------------------------------------------------------------------
def stats(df):
	stats = {}
	# Only work on already 'expanded' dfs
	if 'cumdist' in df.columns: 

		# Location of run is the mean position:
		stats['location'] = {'latitude' : df['latitude'].mean(), 
				'longitude' : df['longitude'].mean(),
				'elevation' : df['elevation'].mean()}

		stats['distance'] = df['cumdist'].iget(-1)

		stats['duration'] = df.shape[0] # can't store timedelta type in mongodb, store in seconds...

		stats['avgspeed'] = df['speedsmooth'].mean()
		stats['maxspeed'] = df['speedsmooth'].max()

	return stats

# Haver distance from gops coordinates
# ------------------------------------------------------------------------
def haverDist(aLong, aLat, bLong, bLat):
  dLat = pi * (bLat - aLat) / 180.0
  dLon = pi * (bLong - aLong) / 180.0
  a = (sin(dLat/2))**2 + cos(pi*aLat/180) * cos(pi*bLat/180) * (sin(dLon/2)**2)
  return (earthRad * 2 * atan2(sqrt(a), sqrt(1-a)))

# Calculate vector of distances from data frame containing gps locations
# ------------------------------------------------------------------------
def distanceFromGps(gps):
	n = gps.shape[0]
	distances = pd.Series(0.0, index=gps.index)
	for i in range(1,n):
		distances[i] = haverDist(gps['longitude'][i-1], gps['latitude'][i-1], gps['longitude'][i], gps['latitude'][i]) # km
	return distances
 
# Calculate instantaneous speed along Series containing interval distances [in km/h]
# ------------------------------------------------------------------------
def speedFromDistance(d):
	dt = 1.0 / 3600.0	# Nike uses 1 sec intervals, expressed here in hours
	speed = d / dt
	return speed

# ------------------------------------------------------------------------
def expandGps(gps):
	gps['distance'] = distanceFromGps(gps)
	gps['speed'] = speedFromDistance(gps['distance'])
	gps['cumdist'] = gps['distance'].cumsum()
	gps['speedsmooth'] = pd.ewma(gps['speed'], span=30)

# Retrieves historical temperature record from wunderground
# ------------------------------------------------------------------------
def temperature(date, loc):
	dateStr = date.strftime("%Y%m%d");
	h = urllib2.urlopen('http://api.wunderground.com/api/658d551039541fcb/history_' + dateStr + '/q/Spain/Madrid.json')
	json_string = h.read()
	parsed_json = json.loads(json_string)

	t = None
	history = parsed_json['history'] 
	for o in history['observations']:
		if (int(o['date']['hour']) == date.hour) and (int(o['date']['mday']) == date.day):			
			t = float(o['tempm'])
			break

	h.close()
	
	return t
	
# ------------------------------------------------------------------------	