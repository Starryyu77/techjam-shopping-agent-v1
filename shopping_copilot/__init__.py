"""Shopping Copilot core package.

The official submission entry point remains :mod:`submission.agent`; this
package groups the reusable state, retrieval, ranking, and adapter modules so
the repository root stays focused on project entry documentation.
"""

from .official_agent import Agent
from .shopping_agent import RealWorldShoppingAgent

__all__ = ["Agent", "RealWorldShoppingAgent"]
