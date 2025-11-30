// script.js — connect the UI in Index.html to a json-server REST API
// Features implemented:
// - load movies from http://localhost:3000/movies
// - render movie list with delete buttons
// - search/filter movies by title or genre
// - submit the "Add New Movie" form to create a movie via POST

const API_URL = 'http://localhost:3000/movies';

// cached DOM elements
const movieListEl = document.getElementById('movie-list');
const searchInput = document.getElementById('search-input');
const addMovieForm = document.getElementById('add-movie-form');

let allMovies = [];

// READ — fetch all movies from the API and render
function fetchMovies() {
  fetch(API_URL)
    .then(response => {
      if (!response.ok) throw new Error(`Server returned ${response.status}`);
      return response.json();
    })
    .then(movies => {
      allMovies = Array.isArray(movies) ? movies : [];
      renderMovies(allMovies);
    })
    .catch(err => showError(`Error fetching movies: ${err.message}`));
}

function renderMovies(moviesToDisplay) {
  movieListEl.innerHTML = '';
  if (!Array.isArray(moviesToDisplay) || moviesToDisplay.length === 0) {
    movieListEl.innerHTML = '<p>No movies found matching your criteria.</p>';
    return;
  }

  moviesToDisplay.forEach(movie => {
    const movieElement = document.createElement('div');
    movieElement.classList.add('movie-item');

    const title = document.createElement('p');
    const strong = document.createElement('strong');
    strong.textContent = movie.title || '(Untitled)';
    title.appendChild(strong);
    const metaText = document.createTextNode(` (${movie.year || 'N/A'}) - ${movie.genre || 'Unknown'}`);
    title.appendChild(metaText);

    const editBtn = document.createElement('button');
    editBtn.classList.add('edit');
    editBtn.textContent = 'Edit';
    // pass values to the prompt helper
    editBtn.addEventListener('click', () => editMoviePrompt(movie.id, movie.title, movie.year, movie.genre));

    const deleteBtn = document.createElement('button');
    deleteBtn.classList.add('delete');
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => deleteMovie(movie.id));

    movieElement.appendChild(title);
    movieElement.appendChild(editBtn);
    movieElement.appendChild(deleteBtn);

    movieListEl.appendChild(movieElement);
  });
}

// Helper: show a quick prompt-based edit dialog, then PATCH the movie
function editMoviePrompt(id, currentTitle = '', currentYear = '', currentGenre = '') {
  if (id === undefined) return showError('Cannot edit: missing id');

  const title = window.prompt('Title:', currentTitle);
  if (title === null) return; // user cancelled
  const yearInput = window.prompt('Release Year:', String(currentYear || ''));
  if (yearInput === null) return;
  const year = parseInt(yearInput, 10) || undefined;
  const genre = window.prompt('Genre:', currentGenre || '') || '';

  const payload = { title: (title || '').trim(), year, genre: (genre || '').trim() };

  // Send PATCH request to update only the fields changed
  fetch(`${API_URL}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(res => {
      if (!res.ok) throw new Error(`Update failed: ${res.status}`);
      return res.json();
    })
    .then(updated => {
      // Update local cache and re-render
      allMovies = allMovies.map(m => (m.id === id ? updated : m));
      renderMovies(filterMovies(searchInput.value));
    })
    .catch(err => showError(err.message));
}

async function deleteMovie(id) {
  if (!confirm('Delete this movie?')) return;
  try {
    const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
    // optimistically update
    allMovies = allMovies.filter(m => m.id !== id);
    renderMovies(allMovies);
  } catch (err) {
    showError(err.message);
  }
}

function filterMovies(query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return allMovies;
  return allMovies.filter(m => {
    const title = (m.title || '').toLowerCase();
    const genre = (m.genre || '').toLowerCase();
    return title.includes(q) || genre.includes(q);
  });
}

searchInput.addEventListener('input', e => {
  const filtered = filterMovies(e.target.value);
  renderMovies(filtered);
});

addMovieForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = (document.getElementById('title').value || '').trim();
  const genre = (document.getElementById('genre').value || '').trim();
  const yearVal = document.getElementById('year').value;
  const year = yearVal ? parseInt(yearVal, 10) : undefined;

  if (!title || !year) {
    showError('Please provide Title and Year');
    return;
  }

  const newMovie = { title, genre, year };

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMovie)
    });
    if (!res.ok) throw new Error(`Add failed: ${res.status}`);
    const created = await res.json();

    // update local cache — json-server will return the created item with an id
    allMovies.push(created);
    renderMovies(allMovies);

    // reset the form
    addMovieForm.reset();
  } catch (err) {
    showError(err.message);
  }
});

function showError(message) {
  // Small, unobtrusive in-page error message
  let el = document.getElementById('mm-error');
  if (!el) {
    el = document.createElement('div');
    el.id = 'mm-error';
    el.style.color = 'red';
    el.style.margin = '10px 0';
    document.body.insertBefore(el, document.body.firstChild);
  }
  el.textContent = message;
  setTimeout(() => { if (el) el.textContent = ''; }, 5000);
}

// initial load
// initial load
document.addEventListener('DOMContentLoaded', fetchMovies);

// Exported for debugging in browser console
window.__movieApp = { fetchMovies, API_URL };
