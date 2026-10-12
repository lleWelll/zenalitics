from dataclasses import dataclass


@dataclass()
class UserCredentials:
    login: str
    password: str
