from typing import List, Dict, Any, Optional
import httpx

MOCK_REPOS = [
    {
        "id": 101,
        "name": "codepilot-ai",
        "full_name": "developer/codepilot-ai",
        "clone_url": "https://github.com/developer/codepilot-ai.git",
        "owner": {"login": "developer", "avatar_url": "https://avatars.githubusercontent.com/u/9919?v=4"}
    },
    {
        "id": 102,
        "name": "fastapi-demo",
        "full_name": "developer/fastapi-demo",
        "clone_url": "https://github.com/developer/fastapi-demo.git",
        "owner": {"login": "developer", "avatar_url": "https://avatars.githubusercontent.com/u/9919?v=4"}
    },
    {
        "id": 103,
        "name": "react-dashboard",
        "full_name": "developer/react-dashboard",
        "clone_url": "https://github.com/developer/react-dashboard.git",
        "owner": {"login": "developer", "avatar_url": "https://avatars.githubusercontent.com/u/9919?v=4"}
    }
]

MOCK_PRS = {
    "developer/codepilot-ai": [
        {
            "number": 42,
            "title": "feat: implement user registration and SQL queries",
            "state": "open",
            "user": {"login": "developer"},
            "head": {"sha": "headsha424242"},
            "base": {"sha": "basesha424242"},
            "html_url": "https://github.com/developer/codepilot-ai/pull/42",
            "body": "This PR adds basic query utility functions and auth route endpoints."
        },
        {
            "number": 43,
            "title": "refactor: optimize DB queries and add cache",
            "state": "closed",
            "user": {"login": "helper_dev"},
            "head": {"sha": "headsha434343"},
            "base": {"sha": "basesha434343"},
            "html_url": "https://github.com/developer/codepilot-ai/pull/43",
            "body": "Implements redis caching layer for repository lookup requests."
        }
    ]
}

MOCK_DIFFS = {
    ("developer/codepilot-ai", 42): """diff --git a/backend/app/db.py b/backend/app/db.py
index a1b2c3d..e5f6g7h 100644
--- a/backend/app/db.py
+++ b/backend/app/db.py
@@ -10,6 +10,12 @@ def get_db_connection():
 
 def fetch_user_by_username(username: str):
+    # TODO: Add index on username column
+    conn = get_db_connection()
+    cursor = conn.cursor()
+    # Possible SQL Injection issue here
+    query = f"SELECT * FROM users WHERE username = '{username}'"
+    cursor.execute(query)
+    return cursor.fetchone()
diff --git a/backend/app/main.py b/backend/app/main.py
index x1y2z3d..u5v6w7h 100644
--- a/backend/app/main.py
+++ b/backend/app/main.py
@@ -20,3 +20,9 @@ def root():
     return {"message": "Hello World"}
+
+def calculate_fibonacci(n: int) -> int:
+    # Extremely slow recursive algorithm without caching
+    if n <= 1:
+        return n
+    return calculate_fibonacci(n - 1) + calculate_fibonacci(n - 2)
"""
}

class GitHubService:
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.is_mock = access_token == "mock_github_access_token_12345"
        self.headers = {
            "Authorization": f"token {access_token}",
            "Accept": "application/vnd.github.v3+json"
        }

    async def list_repositories(self) -> List[Dict[str, Any]]:
        if self.is_mock:
            return MOCK_REPOS
            
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.github.com/user/repos?per_page=100&sort=updated",
                headers=self.headers,
                timeout=10.0
            )
            if response.status_code != 200:
                return []
            return response.json()

    async def list_pull_requests(self, owner: str, repo: str) -> List[Dict[str, Any]]:
        full_name = f"{owner}/{repo}"
        if self.is_mock:
            return MOCK_PRS.get(full_name, [])
            
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.github.com/repos/{owner}/{repo}/pulls?state=all",
                headers=self.headers,
                timeout=10.0
            )
            if response.status_code != 200:
                return []
            return response.json()

    async def get_pull_request(self, owner: str, repo: str, pr_number: int) -> Optional[Dict[str, Any]]:
        full_name = f"{owner}/{repo}"
        if self.is_mock:
            prs = MOCK_PRS.get(full_name, [])
            for pr in prs:
                if pr["number"] == pr_number:
                    return pr
            return None
            
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_number}",
                headers=self.headers,
                timeout=10.0
            )
            if response.status_code != 200:
                return None
            return response.json()

    async def get_pull_request_diff(self, owner: str, repo: str, pr_number: int) -> str:
        full_name = f"{owner}/{repo}"
        if self.is_mock:
            return MOCK_DIFFS.get((full_name, pr_number), "")
            
        diff_headers = self.headers.copy()
        diff_headers["Accept"] = "application/vnd.github.v3.diff"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_number}",
                headers=diff_headers,
                timeout=15.0
            )
            if response.status_code != 200:
                return ""
            return response.text
