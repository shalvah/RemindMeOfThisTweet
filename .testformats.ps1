sls invoke local -f getPage -d '{\"pathParameters\":{\"page\":\"settings\"},\"headers\":{\"cookie\":\"id=vijufui\"}}'

sls invoke local -f startTwitterSignIn

sls invoke local -f completeTwitterSignIn -d '{\"queryStringParameters\":{\"oauth_token\":\"kXK1twAAAAAA93_wAAABblVtl1E\",\"oauth_verifier\":\"xmUANLaCVLR16pdQbjp1ZBo2RFJVyFpr\"}}'