+++
id = "overview"
title = "Same steps, different parcels"
file = "src/main/kotlin/Main.kt"
+++

Shipping an order always takes the same steps: refuse an empty order, prepare a parcel, give it a tracking number,
print its label. What changes from one carrier to the next is the parcel: an express parcel needs a signature and
refuses heavy orders, a standard one does not. Click **Run** to ship two orders with both carriers.

The shop will keep adding carriers. The question this template answers is: **how can the shipping steps stay
written once, while each carrier decides which parcel to create?**

The Factory Method pattern gives one answer. A base class keeps the steps and calls a method to create the parcel;
each subclass overrides that one method.

In the next steps you will see the code before the pattern, the class that keeps the steps, the factory method
itself, and the subclasses that implement it.
