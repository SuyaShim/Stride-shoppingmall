NAMESPACE := ktb-lec

deploy:
	kubectl create namespace $(NAMESPACE) || true
	kubectl apply -f v1.yaml -n $(NAMESPACE)
	kubectl apply -f v2.yaml -n $(NAMESPACE)
	kubectl apply -f ingress.yaml -n $(NAMESPACE)

delete:
	kubectl delete -f v1.yaml -n $(NAMESPACE)
	kubectl delete -f v2.yaml -n $(NAMESPACE)
	kubectl delete -f ingress.yaml -n $(NAMESPACE)
	kubectl delete namespace $(NAMESPACE) || true


patch-pod:
	kubectl patch deploy -n $(NAMESPACE) shopping-mall-v2 --type='merge' -p '{"spec":{"replicas": 5}}'