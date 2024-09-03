// Utility Functions
function capitalizeString(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function truncateDescription(str) {
    if (str.length > 180) {
        const whitespaceIndex = str.indexOf(" ", 180);
        if (whitespaceIndex !== -1) {
            return str.slice(0, whitespaceIndex)
        };
    };
    return str
};

function normalize(description) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = description;
    return tempDiv.textContent
        .trim()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .replace(/\(/g, "&#040;")
        .replace(/\)/g, "&#041;");
}

// DUMB helper classes
class Article {
    constructor(feed, title, date, url, description, image_url) {
        this.feed = feed;
        this.title = title;
        this.date = date;
        this.url = url;
        this.description = description;
        this.image_url = image_url;
    }
}

class feedFetcher {
    constructor() {
        this.CORSProxy = "https://corsproxy.io/?";
    };

    async fetchRSSFeed(url) {
        url = this.CORSProxy + encodeURIComponent(url);
        try {
            const response = await fetch(url);
            const xmlDocument = new DOMParser().parseFromString(await response.text(), "application/xml");
            const items = Array.from(xmlDocument.getElementsByTagName("item"));
            const feedDomain = xmlDocument.getElementsByTagName("title")[0].textContent;

            // Array of Article objects.
            return items.map(item => {
                let title = item.getElementsByTagName("title")[0].textContent;
                let feed = capitalizeString(feedDomain.match(/^[\w]+/)[0]);
                let date = item.getElementsByTagName("pubDate")[0]?.textContent;
                let url = item.getElementsByTagName("link")[0].textContent;
                let description = truncateDescription(normalize(item.getElementsByTagName("description")[0]?.textContent)); 
                let image_url = Array.from(item.getElementsByTagName("*")).find(element => element.hasAttribute("url"))?.getAttribute("url");

                if (!feed || !date || !description || description.includes("undefined") || description.includes("null")) {
                    return null
                };

                if (!image_url) {
                    image_url = "./static/default-image.png "
                };

                return new Article(feed, title, date, url, description, image_url);
            }).filter(article => article !== null);
        } catch (error) {
            console.error("Error fetching RSS feed:", error);
            return [];
        }
    };

    async validateFeed(url) {
        url = this.CORSProxy + encodeURIComponent(url);
        try {
            const response = await fetch(url);
            if (!response.ok || !response.headers.get('Content-Type')?.includes('xml')) {
                return false;
            }
            return true;
        } catch (error) {
            console.error(`Error validating RSS URL: ${url}`, error);
            return false;
        }
    };

};

// DOM Manipulation
const newsFeed = document.getElementById("feed");
const newsReader = document.getElementById("reader");
const addButton = document.getElementById("add-icon");
const modal = document.getElementById("modal");
const closeModalButton = document.getElementById("closeModal");
const saveTextButton = document.getElementById("save-text");
const inputText = document.getElementById("input-text");
const tableBody = document.querySelector("#urls-table tbody");
const feedTable = document.querySelector("main > table");
const pollingInterval = document.querySelector("#polling-interval");

const feed = new feedFetcher();
let feedURLs;
let intervalID;

async function validateRSSURL(url) {
    const domainPattern = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w- ./?%&=]*)?$/;
    if (domainPattern.test(url) && (url.toLowerCase().includes("rss") || url.toLowerCase().includes("feed"))) {
        return await feed.validateFeed(url);
    }
    return false;
};

async function renderArticles() { 
    const fetchAllArticles = feedURLs.map(url => feed.fetchRSSFeed(url));
    const arrays = await Promise.all(fetchAllArticles);

    const articles = arrays
        .flat()
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map((article, index) => {
            return createArticle(
                article.feed,
                article.title,
                article.date,
                article.url,
                article.description,
                article.image_url,
                index       
            );
        }).join("");
    
    feedTable.innerHTML = articles
};

function createArticle(feedName, title, date, url, description, image_url, index) {
    return `
        <tr class="article ${index % 2 === 0 ? "alternate-color" : ""}">
            <td class="cell left-col">
                <div class="icon">
                    <i class="fa fa-newspaper" aria-hidden="true"></i>
                </div>
                <div class="text-container">
                    <h1>${feedName}</h1>
                    <h2>${title}</h2>
                    <p class="date">${date}</p>
                </div>
            </td>

            <td class="cell right-col">
                <img class="image" src="${image_url}" alt="Article Image">
                <p class="description">${description}... <a class="hyperlink" href="${url}" target="_blank">Read more</a></p>
            </td>
        </tr>
    `;
}

function populateTable() {
    tableBody.innerHTML = feedURLs.map((url, index) => `
        <tr>
            <td>${url}</td>
            <td><button onclick="deleteURL(${index})">&times</button></td>
        </tr>
    `).join('');
};

function deleteURL(index) {
    feedURLs.splice(index, 1);
    saveURLs(); 
};

function saveURLs(url = null) {
    if (url) {
        feedURLs.push(url);
    };
    localStorage.setItem("feedURLs", JSON.stringify(feedURLs));
    populateTable();
};

function loadURLs() {
    const stored = localStorage.getItem("feedURLs");
    feedURLs = stored ? JSON.parse(stored) : [];
};

// Event Listeners
saveTextButton.addEventListener("click", async () => {
    const text = inputText.value;
    if (text) {
        try {
            const isValid = await validateRSSURL(text);
            if (isValid) {
                saveURLs(text);
                inputText.value = "";
            } else {
                alert("Please, enter a valid RSS feed URL!");
                inputText.value = "";
            }
        } catch (error) {
            console.error("Error during validation:", error);
            alert("An error occurred while validating the URL.");
            inputText.value = "";
        }
    }
});

addButton.addEventListener("click", () => {
    modal.classList.toggle("toggle-modal");
});

window.addEventListener("click", (event) => {
    if (event.target === modal) {
        modal.classList.toggle("toggle-modal");
    }
});

pollingInterval.addEventListener('change', function() {
    const interval = parseInt(this.value, 10);

    clearInterval(intervalID);
    intervalID = setInterval(renderArticles, interval);
    localStorage.setItem("interval", JSON.stringify(interval));

});

const callback = function(mutationsList, observer) {
    for (let mutation of mutationsList) {
        if (mutation.type === 'childList') {
            renderArticles();
        };
    };
};

const observer = new MutationObserver(callback);
observer.observe(tableBody, { childList: true, subtree: true });

// Initial Render
intervalID = setInterval(renderArticles, (localStorage.getItem("interval") || 300000));
loadURLs();
populateTable();