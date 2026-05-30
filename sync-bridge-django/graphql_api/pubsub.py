import asyncio
from collections import defaultdict
from typing import Any, AsyncGenerator


class InMemoryPubSub:
    def __init__(self) -> None:
        self._queues: dict[str, list[asyncio.Queue]] = defaultdict(list)

    async def publish(self, topic: str, payload: Any) -> None:
        for queue in list(self._queues.get(topic, [])):
            await queue.put(payload)

    async def subscribe(self, topic: str) -> AsyncGenerator[Any, None]:
        queue: asyncio.Queue = asyncio.Queue()
        self._queues[topic].append(queue)
        try:
            while True:
                item = await queue.get()
                yield item
        finally:
            self._queues[topic].remove(queue)


pubsub = InMemoryPubSub()
