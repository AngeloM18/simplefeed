// Utility Functions
function capitalizeString(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

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
class Feed {
    constructor(url, etag,  lastModified, articles) {
        this.url = url;
        this.etag = etag;
        this.lastModified = lastModified;

        // Enforcing typing out of boredom.
        if (Array.isArray(articles) && articles.every(item => item instanceof Article)) {
            this.articles = articles
        } else {
            throw new Error("Argument 'articles' must be an array of Article objects")
        };
    };
}

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
    }

    async fetchRSSFeed(url) {
        url = this.CORSProxy + url;
        try {
            const response = await fetch(url);
            const xmlDocument = new DOMParser().parseFromString(await response.text(), "application/xml");
            const items = Array.from(xmlDocument.getElementsByTagName("item"));
            const feedDomain = xmlDocument.getElementsByTagName("title")[0].textContent;

            // Array of Article objects.
            return items.map(item => {
                let title = item.getElementsByTagName("title")[0].textContent;
                let feed = capitalizeString(feedDomain.match(/^[\w]+/)[0]);
                let date = item.getElementsByTagName("pubDate")[0].textContent;
                let url = item.getElementsByTagName("link")[0].textContent;
                let description = normalize(item.getElementsByTagName("description")[0].textContent);
                let image_url = Array.from(item.getElementsByTagName("*")).find(element => element.hasAttribute("url"))?.getAttribute("url");

                return new Article(feed, title, date, url, description, image_url);
            });
        } catch (error) {
            console.error("Error fetching RSS feed:", error);
            return [];
        }
    }

    async validateFeed(url) {
        url = this.CORSProxy + url;
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
    }
}

// DOM Manipulation
const newsFeed = document.getElementById("feed");
const newsReader = document.getElementById("reader");
const addButton = document.getElementById("add-icon");
const modal = document.getElementById("modal");
const closeModalButton = document.getElementById("closeModal");
const saveTextButton = document.getElementById("save-text");
const inputText = document.getElementById("input-text");
const tableBody = document.querySelector("#urls-table tbody");
const feedTable = document.querySelector("main > table")

let feedURLs = [];
let cachedArticles = [];
const feed = new feedFetcher();

async function validateRSSURL(url) {
    const domainPattern = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w- ./?%&=]*)?$/;
    if (domainPattern.test(url) && (url.toLowerCase().includes("rss") || url.toLowerCase().includes("feed"))) {
        return await feed.validateFeed(url);
    }
    return false;
}

function renderArticles() {
    loadURLs();
    const fetchAllArticles = feedURLs.map(url => feed.fetchRSSFeed(url));
    Promise.all(fetchAllArticles)
        .then(arrays => {
            arrays.flat().sort((a, b) => new Date(b.date) - new Date(a.date))
                .forEach((article, index) => {
                    feedTable.innerHTML += createArticle(
                        article.feed,
                        article.title,
                        article.date,
                        article.url,
                        article.description,
                        article.image_url,
                        index       
                    );
                });
        })
        .catch(error => console.error("Error fetching and rendering feeds:", error));
}

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
    loadURLs(); 
    tableBody.innerHTML = feedURLs.map((url, index) => `
        <tr>
            <td>${url}</td>
            <td><button onclick="deleteURL(${index})">&times</button></td>
        </tr>
    `).join('');
    renderArticles();
}

function deleteURL(index) {
    feedURLs.splice(index, 1);
    saveURLs(); 
    populateTable();
}

function saveURLs() {
    localStorage.setItem("feedURLs", JSON.stringify(feedURLs));
}

function loadURLs() {
    const stored = localStorage.getItem("feedURLs")
    feedURLs = stored ? JSON.parse(stored) : []
}

// Event Listeners
saveTextButton.addEventListener("click", async () => {
    const text = inputText.value;
    if (text) {
        try {
            const isValid = await validateRSSURL(text);
            if (isValid) {
                feedURLs.push(text);
                saveURLs();
                populateTable();
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
    populateTable();
});

window.addEventListener("click", (event) => {
    if (event.target === modal) {
        modal.classList.toggle("toggle-modal");
    }
});

// Initial Render
//renderArticles();