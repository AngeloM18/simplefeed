# SIMPLEFEED
This is a client-side barebones RSS feed reader that I built for myself while working on a server-side, more complex data aggregation project!

This was done using plain HTML, CSS, and JavaScript, without relying on any fancy libraries. It is entirely client-side.
* The code runs directly in your browser, and the feeds you save are stored in the domain's localStorage object (site data) in your browser.
* You can modify the polling rate at which your stored feeds are fetched, ranging from 5 minutes to 4 hours. Since this uses a CORS proxy to fetch data from RSS feeds, I have limited the minimum polling rate to 5 minutes.

![simplefeed-demo](https://github.com/user-attachments/assets/1704ae93-bf82-4e9a-adc8-124efccd53d9)


## TO DO:
* ##### Implement notifications.
* ##### Add a manifest file so anyone can add the domain to their home screen as a PWA.
