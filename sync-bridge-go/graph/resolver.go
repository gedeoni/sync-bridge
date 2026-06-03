package graph

import (
	"database/sql"
	"sync"
	"sync-bridge-go/graph/model"
)

type EmployeeBroker struct {
	mu          sync.Mutex
	subscribers map[chan *model.Employee]bool
}

func NewEmployeeBroker() *EmployeeBroker {
	return &EmployeeBroker{
		subscribers: make(map[chan *model.Employee]bool),
	}
}

func (b *EmployeeBroker) Subscribe() chan *model.Employee {
	b.mu.Lock()
	defer b.mu.Unlock()
	ch := make(chan *model.Employee, 10)
	b.subscribers[ch] = true
	return ch
}

func (b *EmployeeBroker) Unsubscribe(ch chan *model.Employee) {
	b.mu.Lock()
	defer b.mu.Unlock()
	delete(b.subscribers, ch)
	close(ch)
}

func (b *EmployeeBroker) Publish(emp *model.Employee) {
	b.mu.Lock()
	defer b.mu.Unlock()
	for ch := range b.subscribers {
		select {
		case ch <- emp:
		default:
		}
	}
}

type Resolver struct {
	DB     *sql.DB
	Broker *EmployeeBroker
}
