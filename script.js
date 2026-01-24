
        // Language colors map (expanded)
        const languageColors = {
            JavaScript: '#f1e05a',
            TypeScript: '#2b7489',
            Python: '#3572A5',
            Java: '#b07219',
            Go: '#00ADD8',
            Rust: '#dea584',
            Ruby: '#701516',
            PHP: '#4F5D95',
            Swift: '#ffac45',
            Kotlin: '#F18E33',
            C: '#555555',
            'C++': '#f34b7d',
            'C#': '#178600',
            HTML: '#e34c26',
            CSS: '#563d7c',
            Shell: '#89e051',
            Vue: '#41b883',
            Dart: '#00B4AB',
            Scala: '#c22d40',
            R: '#198CE7',
            Perl: '#0298c3',
            Elixir: '#6e4a7e',
            Haskell: '#5e5086',
        };

        // Global state
        let allRepos = [];
        let filteredRepos = [];

        // DOM Elements
        const searchForm = document.getElementById('searchForm');
        const usernameInput = document.getElementById('usernameInput');
        const searchBtn = document.getElementById('searchBtn');
        const loading = document.getElementById('loading');
        const errorMessage = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');
        const profileSection = document.getElementById('profileSection');
        const reposSection = document.getElementById('reposSection');
        const controlsBar = document.getElementById('controlsBar');

        // Profile elements
        const profileAvatar = document.getElementById('profileAvatar');
        const profileName = document.getElementById('profileName');
        const profileUsername = document.getElementById('profileUsername');
        const profileBio = document.getElementById('profileBio');
        const profileLocation = document.getElementById('profileLocation');
        const followersCount = document.getElementById('followersCount');
        const followingCount = document.getElementById('followingCount');
        const reposCount = document.getElementById('reposCount');
        const gistsCount = document.getElementById('gistsCount');
        const profileLink = document.getElementById('profileLink');

        // Repos elements
        const reposGrid = document.getElementById('reposGrid');
        const repoCountBadge = document.getElementById('repoCountBadge');
        const filterInput = document.getElementById('filterInput');
        const sortDropdown = document.getElementById('sortDropdown');

        /**
         * Fetch repository topics/tags
         */
        async function fetchRepoTopics(owner, repo) {
            try {
                const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/topics`, {
                    headers: {
                        'Accept': 'application/vnd.github.mercy-preview+json'
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    return data.names || [];
                }
            } catch (error) {
                console.error('Error fetching topics:', error);
            }
            return [];
        }

        /**
         * Format repository size
         */
        function formatSize(kb) {
            if (kb >= 1024) {
                return `${(kb / 1024).toFixed(1)} MB`;
            }
            return `${kb} KB`;
        }

        /**
         * Fetch GitHub user profile data
         */
        async function fetchProfile(username) {
            const response = await fetch(`https://api.github.com/users/${username}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('User not found. Please check the username and try again.');
                } else if (response.status === 403) {
                    throw new Error('API rate limit exceeded. Please try again later.');
                }
                throw new Error('Failed to fetch profile. Please try again later.');
            }
            
            return await response.json();
        }

        /**
         * Fetch GitHub user repositories
         */
        async function fetchRepositories(username) {
            const response = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=100`);
            
            if (!response.ok) {
                if (response.status === 403) {
                    throw new Error('API rate limit exceeded. Please try again later.');
                }
                throw new Error('Failed to fetch repositories.');
            }
            
            return await response.json();
        }

        /**
         * Display profile data
         */
        function displayProfile(data) {
            profileAvatar.src = data.avatar_url;
            profileAvatar.alt = `${data.login}'s avatar`;
            profileName.textContent = data.name || data.login;
            profileUsername.textContent = `@${data.login}`;
            profileBio.textContent = data.bio || 'No bio available';
            
            if (data.location) {
                profileLocation.innerHTML = `
                    <svg class="github-icon" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M11.536 3.464a5 5 0 010 7.072L8 14.07l-3.536-3.535a5 5 0 117.072-7.072v.001zm1.06 8.132a6.5 6.5 0 10-9.192 0l3.535 3.536a1.5 1.5 0 002.122 0l3.535-3.536zM8 9a2 2 0 100-4 2 2 0 000 4z"/>
                    </svg>
                    ${data.location}
                `;
                profileLocation.style.display = 'flex';
            } else {
                profileLocation.style.display = 'none';
            }
            
            followersCount.textContent = formatNumber(data.followers);
            followingCount.textContent = formatNumber(data.following);
            reposCount.textContent = formatNumber(data.public_repos);
            gistsCount.textContent = formatNumber(data.public_gists);
            profileLink.href = data.html_url;
        }

        /**
         * Sort repositories
         */
        function sortRepositories(repos, sortBy) {
            const sorted = [...repos];
            
            switch(sortBy) {
                case 'stars':
                    return sorted.sort((a, b) => b.stargazers_count - a.stargazers_count);
                case 'forks':
                    return sorted.sort((a, b) => b.forks_count - a.forks_count);
                case 'name':
                    return sorted.sort((a, b) => a.name.localeCompare(b.name));
                case 'updated':
                default:
                    return sorted.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
            }
        }

        /**
         * Filter repositories
         */
        function filterRepositories(repos, query) {
            if (!query.trim()) return repos;
            
            const lowercaseQuery = query.toLowerCase();
            return repos.filter(repo => 
                repo.name.toLowerCase().includes(lowercaseQuery) ||
                (repo.description && repo.description.toLowerCase().includes(lowercaseQuery)) ||
                (repo.language && repo.language.toLowerCase().includes(lowercaseQuery))
            );
        }

        /**
         * Display repositories
         */
        function displayRepositories(repos) {
            reposGrid.innerHTML = '';
            repoCountBadge.textContent = `${repos.length} ${repos.length === 1 ? 'repo' : 'repos'}`;
            
            if (repos.length === 0) {
                reposGrid.innerHTML = '<div class="no-results">No repositories found matching your criteria.</div>';
                return;
            }
            
            repos.forEach((repo, index) => {
                const card = createRepoCard(repo);
                card.style.animation = `fadeInUp 0.5s ease ${index * 0.05}s both`;
                reposGrid.appendChild(card);
            });
        }

        /**
         * Create repository card element
         */
        function createRepoCard(repo) {
            const card = document.createElement('div');
            card.className = 'repo-card';
            
            const languageColor = languageColors[repo.language] || '#8b949e';
            const updatedDate = formatDate(repo.updated_at);
            
            card.innerHTML = `
                <div class="repo-header">
                    <h3 class="repo-name" onclick="window.open('${repo.html_url}', '_blank')">${repo.name}</h3>
                    <a href="${repo.html_url}" target="_blank" class="repo-link" title="View repository">
                        <svg class="github-icon" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                        </svg>
                    </a>
                </div>
                
                ${repo.language ? `
                    <div class="repo-language-tag" style="color: ${languageColor}; border-color: ${languageColor}40; background: ${languageColor}15;">
                        <span class="language-dot" style="background: ${languageColor};"></span>
                        ${repo.language}
                    </div>
                ` : ''}
                
                <p class="repo-description">${repo.description || 'No description provided'}</p>
                
                <div class="repo-meta">
                    <span class="meta-item">
                        <svg class="github-icon" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"/>
                        </svg>
                        ${formatNumber(repo.stargazers_count)}
                    </span>
                    <span class="meta-item">
                        <svg class="github-icon" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M5 3.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm0 2.122a2.25 2.25 0 10-1.5 0v.878A2.25 2.25 0 005.75 8.5h1.5v2.128a2.251 2.251 0 101.5 0V8.5h1.5a2.25 2.25 0 002.25-2.25v-.878a2.25 2.25 0 10-1.5 0v.878a.75.75 0 01-.75.75h-4.5A.75.75 0 015 6.25v-.878zm3.75 7.378a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm3-8.75a.75.75 0 100-1.5.75.75 0 000 1.5z"/>
                        </svg>
                        ${formatNumber(repo.forks_count)}
                    </span>
                    <span class="meta-item">
                        <svg class="github-icon" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0zM8 0a8 8 0 100 16A8 8 0 008 0zm.5 4.75a.75.75 0 00-1.5 0v3.5a.75.75 0 00.471.696l2.5 1a.75.75 0 00.557-1.392L8.5 7.742V4.75z"/>
                        </svg>
                        ${repo.open_issues_count}
                    </span>
                    <span class="meta-item updated-date">
                        Updated ${updatedDate}
                    </span>
                </div>
                

            `;
            
            return card;
        }

        /**
         * Format large numbers with K, M suffixes
         */
        function formatNumber(num) {
            if (num >= 1000000) {
                return (num / 1000000).toFixed(1) + 'M';
            }
            if (num >= 1000) {
                return (num / 1000).toFixed(1) + 'K';
            }
            return num.toString();
        }

        /**
         * Format date to relative time
         */
        function formatDate(dateString) {
            const date = new Date(dateString);
            const now = new Date();
            const diffTime = Math.abs(now - date);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 0) return 'today';
            if (diffDays === 1) return 'yesterday';
            if (diffDays < 30) return `${diffDays} days ago`;
            if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
            return `${Math.floor(diffDays / 365)} years ago`;
        }

        /**
         * Show loading state
         */
        function showLoading() {
            loading.classList.add('active');
            errorMessage.classList.remove('active');
            profileSection.classList.remove('active');
            reposSection.classList.remove('active');
            controlsBar.classList.remove('active');
            searchBtn.disabled = true;
        }

        /**
         * Hide loading state
         */
        function hideLoading() {
            loading.classList.remove('active');
            searchBtn.disabled = false;
        }

        /**
         * Show error message
         */
        function showError(message) {
            errorText.textContent = message;
            errorMessage.classList.add('active');
            profileSection.classList.remove('active');
            reposSection.classList.remove('active');
            controlsBar.classList.remove('active');
        }

        /**
         * Update displayed repositories based on filters
         */
        function updateDisplayedRepos() {
            const filterQuery = filterInput.value;
            const sortBy = sortDropdown.value;
            
            filteredRepos = filterRepositories(allRepos, filterQuery);
            filteredRepos = sortRepositories(filteredRepos, sortBy);
            
            displayRepositories(filteredRepos);
        }

        /**
         * Main function to handle form submission
         */
        async function handleSearch(e) {
            e.preventDefault();
            
            const username = usernameInput.value.trim();
            
            if (!username) {
                showError('Please enter a GitHub username');
                return;
            }
            
            showLoading();
            
            try {
                // Fetch profile and repositories in parallel
                const [profileData, reposData] = await Promise.all([
                    fetchProfile(username),
                    fetchRepositories(username)
                ]);
                
                // Store repos globally
                allRepos = reposData;
                filteredRepos = reposData;
                
                // Display data
                displayProfile(profileData);
                updateDisplayedRepos();
                
                // Show sections
                profileSection.classList.add('active');
                reposSection.classList.add('active');
                controlsBar.classList.add('active');
                
                // Reset filters
                filterInput.value = '';
                sortDropdown.value = 'updated';
                
                hideLoading();
            } catch (error) {
                hideLoading();
                showError(error.message);
            }
        }

        // Event Listeners
        searchForm.addEventListener('submit', handleSearch);
        
        filterInput.addEventListener('input', updateDisplayedRepos);
        sortDropdown.addEventListener('change', updateDisplayedRepos);

        // Keyboard shortcut: Press "/" to focus search
        document.addEventListener('keydown', (e) => {
            if (e.key === '/' && document.activeElement !== usernameInput) {
                e.preventDefault();
                usernameInput.focus();
            }
        });
