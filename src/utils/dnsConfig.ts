// DNS configuration for MongoDB Atlas connection
const dns = require('dns');

export function configureDNS() {
  // Use Google DNS servers to resolve MongoDB Atlas SRV records
  dns.setServers(['8.8.8.8', '8.8.4.4']);
  console.log('DNS configured for MongoDB Atlas');
}