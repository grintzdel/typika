// Package legacypay simulates a third-party SDK: the shop cannot change it, only adapt to it.
package legacypay

import "fmt"

const (
	CodeApproved          = 0
	CodeDoNotHonour       = 5
	CodeInvalidAmount     = 13
	CodeUnknownReference  = 25
	CodeInsufficientFunds = 51
	CodeExpiredCard       = 54
	CodeSuspectedFraud    = 59
	CodeIssuerUnavailable = 91
)

type Response struct {
	Code      int
	Reference string
}

const eur = 978

var codesByCardToken = map[string]int{
	"tok_refused":     CodeDoNotHonour,
	"tok_no_funds":    CodeInsufficientFunds,
	"tok_expired":     CodeExpiredCard,
	"tok_fraud":       CodeSuspectedFraud,
	"tok_issuer_down": CodeIssuerUnavailable,
}

type Client struct {
	balances map[string]int64
}

func NewClient() *Client {
	return &Client{balances: map[string]int64{}}
}

func (c *Client) MakePayment(amountCents int64, currencyCode int, cardToken string) Response {
	if amountCents <= 0 || currencyCode != eur {
		return Response{Code: CodeInvalidAmount}
	}
	if code, refused := codesByCardToken[cardToken]; refused {
		return Response{Code: code}
	}
	reference := fmt.Sprintf("LP-%d", len(c.balances)+1)
	c.balances[reference] = amountCents
	return Response{Code: CodeApproved, Reference: reference}
}

func (c *Client) ReversePayment(reference string, amountCents int64) Response {
	balance, ok := c.balances[reference]
	if !ok {
		return Response{Code: CodeUnknownReference, Reference: reference}
	}
	if amountCents > balance {
		return Response{Code: CodeInvalidAmount, Reference: reference}
	}
	c.balances[reference] = balance - amountCents
	return Response{Code: CodeApproved, Reference: reference}
}
