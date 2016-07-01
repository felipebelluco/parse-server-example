Parse.serverURL = 'https://verkisto-parse-azure.azurewebsites.net/parse/';

// Story > create
Parse.Cloud.define('createStory', function(request, response) {

    if (!request.params.description || request.params.description.trim().length == 0) {
        response.error("Create story failed. Invalid story description!");
        return;
    }

    if (!request.params.text || request.params.text.trim().length == 0) {
        response.error("Create story failed. Invalid story text!");
        return;
    }

    if (!request.params.title || request.params.title.trim().length == 0) {
        response.error("Create story failed. Invalid story title!");
        return;
    }

    if (!request.params.writer) {
        response.error("Create story failed. Invalid story writer!");
        return;
    }

    var story = new (Parse.Object.extend("Story"));

    if (request.params.cover) {
        story.set("cover", new Parse.File("cover", request.params.cover));
    }

    story.set("description", request.params.description);
    story.set("title", request.params.title);
    story.set("total_posts", 1);

    var storyMetric = new (Parse.Object.extend("StoryMetric"));
    storyMetric.set("total_comments", 0);
    storyMetric.set("total_likers", 0);
    storyMetric.set("total_participants", 0);

    story.set("story_metric", storyMetric);

    new Parse.Query("_User").get(request.params.writer, {
        success : function(user) {

            var post = new (Parse.Object.extend("Post"));

            if (request.params.position) {
                post.set("position", request.params.position);
            }

            post.set("text", request.params.text);
            post.set("writer", user);

            post.save(null, {
                success : function(savedPost) {

                    story.set("last_writer", user);
                    story.add("posts", savedPost);
                    story.set("writer", user);

                    story.save(null, {
                        success : function(result) {
                            response.success(result);
                        },
                        error : function(error) {

                            console.log(error.message);
                            options.error(error.message);
                            response.error('Create story failed');
                        }
                    });
                },
                error : function(error) {

                    console.log(error.message);
                    options.error(error.message);
                    response.error('Create post failed');
                }
            });
        },
        error : function() {
            response.error("Create story failed. Story writer not found!");
        }
    });
});

Parse.Cloud.afterSave("Story", function(request) {

    Parse.Cloud.useMasterKey();

    var feed = new (Parse.Object.extend("Feed"));
    feed.set("cover", request.object.get("cover"))
    feed.set("story", request.object);

    var postID = JSON.parse(JSON.stringify(request.object.get("posts")[request.object.get("posts").length - 1]));

    var post = new Parse.Query("Post").get(postID.objectId, {
        success : function(post) {

            feed.set("post", post);
            feed.set("text", post.get("text"));
            feed.set("title", request.object.get("title"));

            if (request.object.get("posts").length == 1) {
                feed.set("type", "created");
            } else {
                feed.set("type", "updated");
            }

            feed.set("writer", request.object.get("writer"));

            feed.save(null, {
                error : function(error) {
                    console.log(error.message);
                }
            });
        }
    });
});

Parse.Cloud.afterSave("Feed", function(request) {

    Parse.Cloud.useMasterKey();

    var json = JSON.parse(JSON.stringify(request.object.get("writer")));

    new Parse.Query("_User").get(json.objectId, {
        success : function(user) {

            user.add("written_stories", request.object.get("story"));
            user.save();
        }
    });
});

// Story > delete
Parse.Cloud.define('deleteStory', function(request, response) {

    if (!request.params.story) {
        response.error('Delete story failed. Invalid story!');
    }

    new Parse.Query("Story").get(request.params.story, {
        success : function(story) {
            story.destroy({
                success : function() {
                    response.success(true);
                },
                error : function(error) {

                    console.log(error.message);
                    options.error(error.message);
                    response.error('Delete story failed');
                }
            });
        },
        error : function(error) {

            response.error("Story not found!");
        }
    });
});

Parse.Cloud.afterDelete("Story", function(request) {

    Parse.Cloud.useMasterKey();

    Parse.Object.destroyAll(request.object.get("posts"));
    Parse.Object.destroyAll(request.object.get("story_metric"));

    new Parse.Query("Feed").equalTo('story', request.object).find({
        success : function(feeds) {
            Parse.Object.destroyAll(feeds);
        }
    });
});

// Story > retrieve
Parse.Cloud.define('retrieveStory', function(request, response) {

    if (!request.params.story) {
        response.error("Retrieve story failed. Invalid story!");
        return;
    }

    new Parse.Query("Story").get(request.params.story, {
        success : function(story) {
            response.success(story);
        },
        error : function() {
            response.error("Story not found!");
        }
    });
});

// Post > create
Parse.Cloud.define('createPost', function(request, response) {

    if (!request.params.text || request.params.text.trim().length == 0) {
        response.error("Create post failed. Invalid post text!");
        return;
    }

    if (!request.params.story) {
        response.error("Create post failed. Invalid post story!");
        return;
    }

    if (!request.params.writer) {
        response.error("Create post failed. Invalid post writer!");
        return;
    }

    new Parse.Query("_User").get(request.params.writer, {
        success : function(user) {

            new Parse.Query("Story").get(request.params.story, {
                success : function(story) {

                    var post = new (Parse.Object.extend("Post"));

                    if (request.params.position) {
                        post.set("position", request.params.position);
                    }

                    post.set("text", request.params.text);
                    post.set("writer", user);

                    post.save(null, {
                        success : function(savedPost) {

                            story.set("last_writer", user);
                            story.add("posts", savedPost);
                            story.set("total_posts", story.get("posts").length);

                            story.save(null, {
                                success : function(result) {
                                    response.success(post);
                                },
                                error : function(error) {

                                    console.log(error.message);
                                    options.error(error.message);
                                    response.error('Create story failed');
                                }
                            });
                        },
                        error : function(error) {

                            console.log(error.message);
                            options.error(error.message);
                            response.error('Create post failed');
                        }
                    });

                },
                error : function() {
                    response.error("Create post failed. Post story not found!");
                }
            });
        },
        error : function() {
            response.error("Create post failed. Post writer not found!");
        }
    });
});

// Post > delete
Parse.Cloud.define('deletePost', function(request, response) {

    if (!request.params.post) {
        response.error('Delete post failed. Invalid post!');
    }

    new Parse.Query("Post").get(request.params.post, {
        success : function(post) {
            post.destroy({
                success : function() {
                    response.success(true);
                },
                error : function(error) {

                    console.log(error.message);
                    options.error(error.message);
                    response.error('Delete post failed');
                }
            });
        },
        error : function(error) {

            response.error("Post not found!");
        }
    });
});

Parse.Cloud.afterDelete("Post", function(request) {

    Parse.Cloud.useMasterKey();

    new Parse.Query("Feed").equalTo('post', request.object).find({
        success : function(feeds) {
            Parse.Object.destroyAll(feeds);
        }
    });
});

// User > follow writer
Parse.Cloud.define('followWriter', function(request, response) {

    Parse.Cloud.useMasterKey();

    if (!request.params.user || request.params.user.trim().length == 0) {
        response.error("Follow writer failed. Invalid user!");
        return;
    }

    if (!request.params.writer || request.params.writer.trim().length == 0) {
        response.error("Follow writer failed. Invalid writer!");
        return;
    }

    if (request.params.user === request.params.writer) {
        response.error("Follow writer failed. User and writer must be different!");
        return;
    }

    new Parse.Query("_User").get(request.params.user, {
        success : function(user) {

            new Parse.Query("_User").get(request.params.writer, {
                success : function(writer) {

                    user.add("following", writer);
                    user.set("total_following", user.get("following").length);
                    user.save(null, {
                        success : function(savedUser) {

                            writer.add("followers", user);
                            writer.set("total_followers", writer.get("followers").length);
                            writer.save(null, {
                                success : function(savedWriter) {

                                    response.success(true);
                                },
                                error : function(error) {
                                    response.error("Follow writer failed.");
                                }
                            });
                        },
                        error : function(error) {
                            response.error("Follow writer failed.");
                        }
                    });
                },
                error : function(error) {
                    response.error("Follow writer failed. Writer not found!");
                }
            });
        },
        error : function(error) {
            response.error("Follow writer failed. User not found!");
        }
    });
});

//User > follow writer
Parse.Cloud.define('followStory', function(request, response) {

    Parse.Cloud.useMasterKey();

    if (!request.params.user || request.params.user.trim().length == 0) {
        response.error("Follow story failed. Invalid user!");
        return;
    }

    if (!request.params.story || request.params.story.trim().length == 0) {
        response.error("Follow story failed. Invalid story!");
        return;
    }

    new Parse.Query("_User").get(request.params.user, {
        success : function(user) {

            new Parse.Query("Story").get(request.params.story, {
                success : function(story) {

                    user.add("following_stories", story);
                    user.set("total_following_stories", user.get("following_stories").length);
                    user.save(null, {
                        success : function(savedUser) {
                            response.success(true);
                        },
                        error : function(error) {
                            response.error("Follow story failed.");
                        }
                    });
                },
                error : function(error) {
                    response.error("Follow story failed. Story not found!");
                }
            });
        },
        error : function(error) {
            response.error("Follow story failed. User not found!");
        }
    });
});

// User > unfollow writer
Parse.Cloud.define('unfollowWriter', function(request, response) {

    if (!request.params.user || request.params.user.trim().length == 0) {
        response.error("Unfollow writer failed. Invalid user!");
        return;
    }

    if (!request.params.writer || request.params.writer.trim().length == 0) {
        response.error("Unfollow writer failed. Invalid writer!");
        return;
    }

    if (request.params.user == request.params.writer) {
        response.error("Unfollow writer failed. User and writer must be different!");
        return;
    }
});

// Feed
Parse.Cloud.define('retrieveActivityStories', function(request, response) {

    var writerQuery = new Parse.Query('_User').equalTo('objectId', request.params.writerId);

    var ownedStoriesQuery = new Parse.Query('Story').matchesQuery('writer', writerQuery);

    var participatedStoriesQuery = new Parse.Query('Story').matchesQuery('participants', writerQuery);

    Parse.Query.or(ownedStoriesQuery, participatedStoriesQuery).descending('updatedAt').include('writer').find({
        success : function(results) {
            response.success(results);
        },
        error : function(error) {
            response.error('Find activity stories failed');
        }
    });
});

// Dicovery > most commented stories
Parse.Cloud.define('retrieveMostCommentedStories', function(request, response) {
    var query = new Parse.Query('Story').select('cover', 'createdAt', 'description', 'objectId', 'title', 'updatedAt', 'writer').descending('totalComments');

    if (request.params.pageNumber && request.params.pageSize) {
        query.skip(request.params.pageNumber).limit(request.params.pageSize);
    }

    query.find({
        success : function(results) {
            response.success(results);
        },
        error : function(error) {
            response.error('Retrieve most commented stories failed');
        }
    });
});

// Discovery > most liked stories
Parse.Cloud.define('retrieveMostLikedStories', function(request, response) {

    var query = new Parse.Query('Story').select('cover', 'createdAt', 'description', 'objectId', 'title', 'updatedAt', 'writer').descending('totalLikers');

    if (request.params.pageNumber && request.params.pageSize) {
        query.skip(request.params.pageNumber).limit(request.params.pageSize);
    }

    query.find({
        success : function(results) {
            response.success(results);
        },
        error : function(error) {
            response.error('Retrieve most liked stories failed');
        }
    });
});

// Discovery > most participed stories
Parse.Cloud.define('retrieveMostParticipatedStories', function(request, response) {

    var query = new Parse.Query('Story').select('cover', 'createdAt', 'description', 'objectId', 'title', 'updatedAt', 'writer').descending('totalParticipants');

    if (request.params.pageNumber && request.params.pageSize) {
        query.skip(request.params.pageNumber).limit(request.params.pageSize);
    }

    query.find({
        success : function(results) {
            response.success(results);
        },
        error : function(error) {
            response.error('Retrieve most participated stories failed');
        }
    });
});

// Discovery > most posted stories
Parse.Cloud.define('retrieveMostPostedStories', function(request, response) {

    var query = new Parse.Query('Story').select('cover', 'createdAt', 'description', 'objectId', 'title', 'updatedAt', 'writer').descending('totalPosts');

    if (request.params.pageNumber && request.params.pageSize) {
        query.skip(request.params.pageNumber).limit(request.params.pageSize);
    }

    query.find({
        success : function(results) {
            response.success(results);
        },
        error : function(error) {
            response.error('Retrieve most posted stories failed');
        }
    });
});

// Discovery > new stories
Parse.Cloud.define('retrieveNewStories', function(request, response) {

    var query = new Parse.Query('Story').select('cover', 'createdAt', 'description', 'objectId', 'title', 'updatedAt', 'writer').descending('updatedAt');

    if (request.params.pageNumber && request.params.pageSize) {
        query.skip(request.params.pageNumber).limit(request.params.pageSize);
    }

    query.find({
        success : function(results) {
            response.success(results);
        },
        error : function(error) {
            response.error('Retrieve new stories failed');
        }
    });
});

// Feed
Parse.Cloud.define('retrieveFeed', function(request, response) {

    new Parse.Query("_User").select('following', 'following_stories').get(request.params.user, {
        success : function(user) {

            new Parse.Query("Feed").containedIn('story', user.get('following_stories')).find({
                success : function(feeds) {
                    response.success(feeds);
                },
                error : function(error) {
                }
            });
        },
        error : function(error) {
        }
    });
});
