package infra

import (
	"errors"
	"fmt"
)

var ErrBrokerUnavailable = errors.New("broker unavailable")

type Message struct {
	Topic   string
	Payload string
}

type FakeBroker struct {
	Published []Message
	down      bool
}

func NewFakeBroker() *FakeBroker {
	return &FakeBroker{}
}

func (b *FakeBroker) GoDown() {
	b.down = true
}

func (b *FakeBroker) ComeBack() {
	b.down = false
}

func (b *FakeBroker) Publish(topic string, payload []byte) error {
	if b.down {
		return fmt.Errorf("%w, %s not published", ErrBrokerUnavailable, topic)
	}
	b.Published = append(b.Published, Message{Topic: topic, Payload: string(payload)})
	fmt.Printf("broker <- %s %s\n", topic, payload)
	return nil
}
