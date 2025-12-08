NAMESPACE := ktb-lec

deploy:
	kubectl apply -f v1.yaml -n $(NAMESPACE)
	kubectl apply -f v2.yaml -n $(NAMESPACE)
	kubectl apply -f ingress.yaml -n $(NAMESPACE)