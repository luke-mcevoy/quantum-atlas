"""Refuse IP sockets for an examples-harness process.

Imported automatically when this directory is on PYTHONPATH. Unix sockets stay
available. socket.socket stays a class so the standard library can subclass it
(ssl.SSLSocket). Connecting, resolving names, and creating IP sockets still fail.
The runner also unsets AWS_*, QISKIT_IBM_*, DWAVE_*, and AZURE_*.
"""

import socket

_OrigSocket = socket.socket


class _NoIPSocket(_OrigSocket):
    def __init__(self, family=-1, type=socket.SOCK_STREAM, proto=0, fileno=None):
        if fileno is None and family in (-1, socket.AF_INET, socket.AF_INET6):
            raise OSError("network disabled for the examples harness")
        if fileno is None:
            super().__init__(family, type, proto)
        else:
            super().__init__(family, type, proto, fileno)


def _refuse(*_args, **_kwargs):
    raise OSError("network disabled for the examples harness")


socket.socket = _NoIPSocket
socket.create_connection = _refuse
socket.create_server = _refuse
socket.getaddrinfo = _refuse
socket.gethostbyname = _refuse
socket.gethostbyname_ex = _refuse
socket.gethostbyaddr = _refuse
