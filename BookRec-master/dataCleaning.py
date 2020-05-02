import pandas as pd
import gzip

from pandas._libs import json


def parse(path):
  g = gzip.open(path, 'rb')
  for l in g:
    yield json.loads(l)

def getratingsDF(path):
  i = 0
  for d in parse(path):
    df[i] = d
    i += 1
  return pd.DataFrame.from_dict(df, orient='index')

df = getratingsDF('Books_5.json.gz')

def parse(path):
  g = gzip.open(path, 'r')
  for l in g:
    yield json.loads(l)