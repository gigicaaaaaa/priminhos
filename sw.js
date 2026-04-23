self.addEventListener("push", function(event) {
  const data = event.json();

  self.registration.showNotification(data.title, {
    body: data.body
  });
});
