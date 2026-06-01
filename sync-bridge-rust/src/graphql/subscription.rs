// src/graphql/subscription.rs
use async_graphql::{Context, Subscription};
use futures_util::stream::{self, Stream};
use tokio::sync::broadcast::Sender;

use crate::graphql::schema::Employee;

pub struct Subscription;

#[Subscription]
impl Subscription {
    // broadcast stream of created employees
    async fn employee_created(&self, ctx: &Context<'_>) -> impl Stream<Item = Employee> {
        let sender = ctx.data::<Sender<Employee>>().unwrap();
        let rx = sender.subscribe();

        stream::unfold(rx, |mut rx| async move {
            match rx.recv().await {
                Ok(emp) => Some((emp, rx)),
                Err(_) => None, // Stop stream if lagged or channel closed
            }
        })
    }
}
