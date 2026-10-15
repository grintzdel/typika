The subscribers are fine: a service that times out will always throw sooner or later. The problem is in how
`publish` calls them. What happens to the loop when one call throws?
