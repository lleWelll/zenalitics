from dataclasses import dataclass
from http import HTTPStatus
from typing import Final

import requests

REQUEST_TIMEOUT: Final[int] = 60
BASE_URL: Final[str]        = "https://zenmoney.ru"
PROFILE_URL: Final[str]     = BASE_URL + "/api/s1/profile/"
ENTER_URL: Final[str]       = BASE_URL + "/login/enter/"
DOWNLOAD_URL: Final[str]    = BASE_URL + "/export/download2011/"
APP_URL: Final[str]         = BASE_URL + "/a/"

class LoginException(Exception):
    pass
class FetchException(Exception):
    pass
class ArgumentException(Exception):
    pass

@dataclass()
class UserCredentials:
    login: str
    password: str

def _login(creds: UserCredentials, session: requests.Session) -> None:
    data = {
        "noredirect": "true",
        "login": creds.login.strip(),
        "password": creds.password.strip(),
    }
    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
    }

    resp = session.post(ENTER_URL, headers=headers, data=data, timeout=REQUEST_TIMEOUT)
    if resp.status_code < HTTPStatus.OK or resp.status_code >= HTTPStatus.NO_CONTENT:
        raise LoginException(f"login: unexpected response status from {ENTER_URL}, {resp.status_code}")

def _verify_auth(session: requests.Session) -> None:
    resp = session.get(PROFILE_URL, timeout=REQUEST_TIMEOUT)

    content_type = resp.headers.get("Content-Type", "")
    if "text/json" not in content_type:
        raise FetchException(f"fetch data: invalide Content-Type: {content_type!r}")

    data = resp.json()
    if len(data) == 0 or "user" not in data or data["user"] == None:
        raise LoginException("verify auth: not authenticated")

def _fetch_data(session: requests.Session) -> bytes:
    data = {
        "month_filter": "0",
        "account_filter": "0",
    }
    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Referer": APP_URL,
    }

    resp = session.post(DOWNLOAD_URL, headers=headers, data=data, timeout=REQUEST_TIMEOUT)

    if resp.status_code < HTTPStatus.OK or resp.status_code >= HTTPStatus.NO_CONTENT:
        raise FetchException(f"fetch data: unexpected response status from {DOWNLOAD_URL}, {resp.status_code}")

    content_type = resp.headers.get("Content-Type", "")
    if "text/csv" not in content_type:
        raise FetchException(f"fetch data: invalide Content-Type: {content_type!r}")

    return resp.content

def export_data(creds: UserCredentials) -> bytes:
    with requests.session() as session:
        _login(creds, session)
        _verify_auth(session)
        return _fetch_data(session)
