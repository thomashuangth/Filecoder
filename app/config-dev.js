module.exports = {
	'serverPort'		: '80', 				/* 80 */
	'mongoServer' 		: '192.168.75.70',			/* 192.168.X.X */
	'mongoServer2' 		: '192.168.75.80',			/* 192.168.X.X */
	'mongoServer3' 		: '192.168.75.90',			/* 192.168.X.X */
	'databaseName' 		: 'filecoder',			/* transcoder */
	'domain'			: 'filecoder.com', 	/* Don't forget to change Social Network Callback URI */
	'storageServer'		: '/root/transcoder/public/nfs',			/* /mnt/iscsi/ */

	'paypal' : {
		'client_id'		: 'AXwGfKoKJxre0qqLXflMwqHWRNh3a1eyln7DuLYbOlSiU5T8F7dJEZaJsrvmFWXAbowBGTXscEkEHexJ',
		'client_secret'	: 'EMYmCkiUvo0n2gPV2je8c0lYZX-C6kCt0_513UVeu9tTkLCQ9PtfZ_Qo4jB8z3ReB3RO84oEka0CmVVz'
	},

	'ssh' : {
		'host'			: '192.168.75.40',
		'host2'			: '192.168.75.41',
		'user'			: 'root',
		'pass'			: 'supinfo'
	}
}