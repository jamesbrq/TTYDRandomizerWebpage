import io
from js import window

from typing import Dict
from Data import Rels


class TTYDPatcher:
    rels: Dict[Rels, io.BytesIO] = {}

    def __init__(self):
        print(window.testVar)

def get_rel_path(rel: Rels):
    return f'files/rel/{rel.value}.rel'